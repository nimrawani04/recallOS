import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { alexaConfig, appBaseUrl } from "./provider-config.server";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function allowedRedirectUri(value: string) {
  const config = alexaConfig();
  return config.allowedRedirectUris.includes(value);
}

export async function handleAlexaAuthorize(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") ?? "";
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const responseType = url.searchParams.get("response_type") ?? "";
  const scope = url.searchParams.get("scope") ?? "smart_home";
  const config = alexaConfig();
  if (
    clientId !== config.clientId ||
    responseType !== "code" ||
    !state ||
    !allowedRedirectUri(redirectUri)
  ) {
    return new Response("Invalid Alexa account-linking request.", { status: 400 });
  }

  const requestId = randomUUID();
  const { error } = await supabaseAdmin.from("alexa_oauth_requests").insert({
    id: requestId,
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (error) throw new Error(error.message);

  return Response.redirect(`${appBaseUrl()}/alexa/link?request_id=${requestId}`, 302);
}

export async function completeAlexaAuthorization(input: { requestId: string; userId: string }) {
  const { data: pending, error: pendingError } = await supabaseAdmin
    .from("alexa_oauth_requests")
    .select("id,client_id,redirect_uri,state,scope,expires_at,completed_at")
    .eq("id", input.requestId)
    .is("completed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (pendingError) throw new Error(pendingError.message);
  if (!pending) throw new Error("The Alexa account-linking request is missing or expired.");

  const code = randomBytes(32).toString("base64url");
  const { error } = await supabaseAdmin
    .from("alexa_oauth_requests")
    .update({
      user_id: input.userId,
      code_hash: hash(code),
      code_expires_at: new Date(Date.now() + 60_000).toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("id", pending.id)
    .is("completed_at", null);
  if (error) throw new Error(error.message);

  const config = alexaConfig();
  const { data: connection, error: connectionError } = await supabaseAdmin
    .from("provider_connections")
    .upsert(
      {
        user_id: input.userId,
        provider: "alexa",
        external_account_id: config.skillId,
        display_name: "Alexa Smart Home",
        status: "connected",
        metadata: { skillId: config.skillId, scopes: ["smart_home"] } as Json,
        updated_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: "user_id,provider,external_account_id" },
    )
    .select("id")
    .single();
  if (connectionError || !connection) {
    throw new Error(connectionError?.message ?? "Could not save Alexa connection.");
  }

  const redirect = new URL(pending.redirect_uri);
  redirect.searchParams.set("code", code);
  redirect.searchParams.set("state", pending.state);
  return { redirectUrl: redirect.toString() };
}

export async function handleAlexaToken(request: Request) {
  const form = await request.formData();
  const config = alexaConfig();
  const clientId = String(form.get("client_id") ?? "");
  const clientSecret = String(form.get("client_secret") ?? "");
  const grantType = String(form.get("grant_type") ?? "");
  const code = String(form.get("code") ?? "");
  if (
    clientId !== config.clientId ||
    clientSecret !== config.clientSecret ||
    grantType !== "authorization_code" ||
    !code
  ) {
    return jsonResponse({ error: "invalid_grant" }, 400);
  }

  const { data: pending, error: pendingError } = await supabaseAdmin
    .from("alexa_oauth_requests")
    .select("id,user_id,client_id,redirect_uri,code_hash,code_expires_at,completed_at,consumed_at")
    .eq("client_id", clientId)
    .eq("code_hash", hash(code))
    .is("consumed_at", null)
    .gt("code_expires_at", new Date().toISOString())
    .maybeSingle();
  if (pendingError) throw new Error(pendingError.message);
  if (!pending?.user_id || !pending.code_hash) return jsonResponse({ error: "invalid_grant" }, 400);

  const accessToken = randomBytes(32).toString("base64url");
  const { error: consumeError } = await supabaseAdmin
    .from("alexa_oauth_requests")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", pending.id)
    .is("consumed_at", null);
  if (consumeError) throw new Error(consumeError.message);

  const { error: tokenError } = await supabaseAdmin.from("alexa_tokens").insert({
    user_id: pending.user_id,
    client_id: clientId,
    access_token_hash: hash(accessToken),
    scopes: ["smart_home"],
    expires_at: new Date(Date.now() + config.tokenTtlSeconds * 1000).toISOString(),
  });
  if (tokenError) throw new Error(tokenError.message);
  return jsonResponse({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: config.tokenTtlSeconds,
    refresh_token: undefined,
  });
}

async function alexaUser(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const accessToken = header.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return null;
  const { data, error } = await supabaseAdmin
    .from("alexa_tokens")
    .select("user_id,client_id,scopes,expires_at")
    .eq("access_token_hash", hash(accessToken))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function handleAlexaSmartHome(request: Request) {
  const token = await alexaUser(request);
  if (!token) return jsonResponse({ error: "invalid_token" }, 401);
  const body = (await request.json()) as {
    event?: { header?: { namespace?: string; name?: string; messageId?: string } };
  };
  const namespace = body.event?.header?.namespace;
  const name = body.event?.header?.name;
  const { data: devices, error } = await supabaseAdmin
    .from("smart_home_devices")
    .select("id,name,model,status,kind,capabilities")
    .eq("user_id", token.user_id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  if (namespace === "Alexa.Discovery" && name === "Discover") {
    return jsonResponse({
      event: {
        header: {
          namespace: "Alexa.Discovery",
          name: "Discover.Response",
          payloadVersion: "3",
          messageId: randomUUID(),
        },
        payload: {
          endpoints: (devices ?? []).map((device) => ({
            endpointId: `recallos-${device.id}`,
            manufacturerName: "RecallOS",
            friendlyName: device.name,
            description: `${device.model} connected through RecallOS`,
            displayCategories: [device.kind === "doorbell" ? "DOORBELL" : "CAMERA"],
            additionalAttributes: { manufacturer: "RecallOS", model: device.model },
            capabilities: [
              { type: "AlexaInterface", interface: "Alexa", version: "3" },
              {
                type: "AlexaInterface",
                interface: "Alexa.EndpointHealth",
                version: "3.1",
                properties: {
                  supported: [{ name: "connectivity" }],
                  proactivelyReported: false,
                  retrievable: true,
                },
              },
            ],
          })),
        },
      },
    });
  }

  if (namespace === "Alexa" && name === "ReportState") {
    return jsonResponse({
      context: {
        properties: (devices ?? []).map((device) => ({
          namespace: "Alexa.EndpointHealth",
          name: "connectivity",
          value: { value: device.status === "offline" ? "UNREACHABLE" : "OK" },
          timeOfSample: new Date().toISOString(),
          uncertaintyInMilliseconds: 0,
          endpointId: `recallos-${device.id}`,
        })),
      },
      event: {
        header: {
          namespace: "Alexa",
          name: "StateReport",
          payloadVersion: "3",
          messageId: randomUUID(),
          correlationToken: body.event?.header?.messageId,
        },
        endpoint: { endpointId: "recallos-bridge" },
        payload: {},
      },
    });
  }

  return jsonResponse({
    event: {
      header: {
        namespace: "Alexa",
        name: "ErrorResponse",
        payloadVersion: "3",
        messageId: randomUUID(),
      },
      endpoint: { endpointId: "recallos-bridge" },
      payload: {
        type: "INVALID_DIRECTIVE",
        message: "RecallOS supports discovery and health reporting for connected Ring devices.",
      },
    },
  });
}
