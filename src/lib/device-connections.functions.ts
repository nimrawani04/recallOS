import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DeviceKind } from "./device-connection";

const safeProvider = z.enum(["ring", "alexa", "aws"]);

type ProviderConnectionDto = {
  id: string;
  provider: "ring" | "alexa" | "aws";
  externalAccountId: string;
  displayName: string;
  status: "connected" | "needs_reauth" | "revoked";
  scopes: string[];
  updatedAt: string;
};

type SmartHomeDeviceDto = {
  id: string;
  provider: "ring" | "alexa";
  externalDeviceId: string;
  name: string;
  kind: DeviceKind;
  model: string;
  location: string;
  status: "online" | "offline" | "unknown";
  capabilities: string[];
  lastSeenAt: string | null;
};

function connectionDto(row: Record<string, unknown>): ProviderConnectionDto {
  return {
    id: String(row["id"]),
    provider: safeProvider.parse(row["provider"]),
    externalAccountId: String(row["external_account_id"]),
    displayName: String(row["display_name"]),
    status: z.enum(["connected", "needs_reauth", "revoked"]).parse(row["status"]),
    scopes: Array.isArray(row["scopes"])
      ? row["scopes"].filter((value): value is string => typeof value === "string")
      : [],
    updatedAt: String(row["updated_at"]),
  };
}

function deviceDto(row: Record<string, unknown>): SmartHomeDeviceDto {
  return {
    id: String(row["id"]),
    provider: z.enum(["ring", "alexa"]).parse(row["provider"]),
    externalDeviceId: String(row["external_device_id"]),
    name: String(row["name"]),
    kind: z.enum(["doorbell", "camera", "speaker", "light", "sensor", "chime"]).parse(row["kind"]),
    model: String(row["model"] ?? ""),
    location: String(row["location"] ?? ""),
    status: z.enum(["online", "offline", "unknown"]).parse(row["status"]),
    capabilities: Array.isArray(row["capabilities"])
      ? row["capabilities"].filter((value): value is string => typeof value === "string")
      : [],
    lastSeenAt: typeof row["last_seen_at"] === "string" ? row["last_seen_at"] : null,
  };
}

export const getDeviceBridge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [
      { data: connectionRows, error: connectionError },
      { data: deviceRows, error: deviceError },
      { data: setupRow, error: setupError },
    ] = await Promise.all([
      context.supabase
        .from("provider_connections")
        .select("id,provider,external_account_id,display_name,status,metadata,updated_at")
        .order("updated_at", { ascending: false }),
      context.supabase
        .from("smart_home_devices")
        .select(
          "id,provider,external_device_id,name,kind,model,location,status,capabilities,last_seen_at",
        )
        .order("updated_at", { ascending: false }),
      context.supabase
        .from("device_setups")
        .select("selected_device_id,status,completed_at,updated_at")
        .maybeSingle(),
    ]);
    if (connectionError) throw new Error(connectionError.message);
    if (deviceError) throw new Error(deviceError.message);
    if (setupError) throw new Error(setupError.message);

    const connections = (connectionRows ?? []).map((row) =>
      connectionDto({
        ...row,
        scopes: (row["metadata"] as { scopes?: unknown } | null)?.scopes ?? [],
      }),
    );
    if (
      process.env["AWS_REGION"] &&
      process.env["AWS_EVENT_BUS_NAME"] &&
      process.env["AWS_ACCESS_KEY_ID"] &&
      process.env["AWS_SECRET_ACCESS_KEY"]
    ) {
      try {
        const { awsConfig } = await import("./provider-config.server");
        awsConfig();
        connections.push({
          id: "aws-eventbridge",
          provider: "aws",
          externalAccountId: process.env["AWS_EVENT_BUS_NAME"]!,
          displayName: "RecallOS EventBridge",
          status: "connected",
          scopes: ["events:put"],
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // The UI will show AWS as unavailable when the server credentials are incomplete.
      }
    }
    return {
      connections,
      devices: (deviceRows ?? []).map((row) => deviceDto(row)),
      setup: setupRow
        ? {
            selectedDeviceId: setupRow.selected_device_id,
            status: setupRow.status,
            completedAt: setupRow.completed_at,
          }
        : null,
    };
  });

export const getRingAppStoreUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(() => {
    return import("./provider-config.server").then(({ ringConfig }) => ({
      url: ringConfig().appstoreUrl,
    }));
  });

export const getAlexaSkillUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(() => {
    return import("./provider-config.server").then(({ alexaConfig }) => ({
      url: alexaConfig().skillUrl,
    }));
  });

export const completeAlexaLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ requestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { completeAlexaAuthorization } = await import("./alexa.server");
    return completeAlexaAuthorization({ requestId: data.requestId, userId: context.userId });
  });

export const claimRingConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ nonce: z.string().min(20), time: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deserializeProviderSecret, serializeProviderSecret } =
      await import("./provider-crypto.server");
    const { confirmRingAppIntegration, verifyRingNonce } = await import("./ring.server");
    const { data: claims, error: claimError } = await supabaseAdmin
      .from("provider_link_claims")
      .select(
        "id,external_account_id,access_token,refresh_token,token_expires_at,scopes,hardware_id,metadata,expires_at,claimed_at",
      )
      .eq("provider", "ring")
      .is("claimed_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(25);
    if (claimError) throw new Error(claimError.message);

    const claim = (claims ?? []).find((candidate) =>
      verifyRingNonce(data.nonce, data.time, candidate.external_account_id),
    );
    if (!claim)
      throw new Error("The Ring link is invalid or has expired. Start again from the Ring app.");

    const accessToken = deserializeProviderSecret(claim.access_token);
    const refreshToken = deserializeProviderSecret(claim.refresh_token);
    await confirmRingAppIntegration(accessToken, claim.hardware_id);

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("provider_connections")
      .upsert(
        {
          user_id: context.userId,
          provider: "ring",
          external_account_id: claim.external_account_id,
          display_name: "Ring home",
          hardware_id: claim.hardware_id,
          status: "connected",
          metadata: { ...(claim.metadata as Record<string, unknown>), scopes: claim.scopes },
          updated_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: "user_id,provider,external_account_id" },
      )
      .select("id")
      .single();
    if (connectionError || !connection)
      throw new Error(connectionError?.message ?? "Could not save Ring connection.");

    const { error: secretError } = await supabaseAdmin.from("provider_connection_secrets").upsert(
      {
        connection_id: connection.id,
        access_token: serializeProviderSecret(accessToken),
        refresh_token: serializeProviderSecret(refreshToken),
        token_expires_at: claim.token_expires_at,
        scopes: claim.scopes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "connection_id" },
    );
    if (secretError) throw new Error(secretError.message);

    const { error: consumedError } = await supabaseAdmin
      .from("provider_link_claims")
      .update({ claimed_at: new Date().toISOString() })
      .eq("id", claim.id)
      .is("claimed_at", null);
    if (consumedError) throw new Error(consumedError.message);

    const devices = await persistRingDevices({
      userId: context.userId,
      connectionId: connection.id,
      accountId: claim.external_account_id,
      accessToken,
      hardwareId: claim.hardware_id,
    });
    return { connectionId: connection.id, devices };
  });

export const discoverDevices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: connections, error } = await context.supabase
      .from("provider_connections")
      .select("id,provider,external_account_id,hardware_id,status")
      .eq("provider", "ring")
      .eq("status", "connected");
    if (error) throw new Error(error.message);
    const devices: SmartHomeDeviceDto[] = [];
    for (const connection of connections ?? []) {
      const secret = await loadRingSecret(connection.id);
      const refreshed = await maybeRefreshRingSecret(connection.id, secret);
      devices.push(
        ...(await persistRingDevices({
          userId: context.userId,
          connectionId: connection.id,
          accountId: connection.external_account_id,
          accessToken: refreshed.accessToken,
          hardwareId: connection.hardware_id,
        })),
      );
    }
    return { devices };
  });

export const selectAnchorDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ deviceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: device, error: deviceError } = await context.supabase
      .from("smart_home_devices")
      .select("id")
      .eq("id", data.deviceId)
      .maybeSingle();
    if (deviceError) throw new Error(deviceError.message);
    if (!device) throw new Error("That device is not available to this account.");
    const { error } = await context.supabase.from("device_setups").upsert(
      {
        user_id: context.userId,
        selected_device_id: data.deviceId,
        status: "active",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { selectedDeviceId: data.deviceId, status: "active" as const };
  });

export const disconnectProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ provider: safeProvider }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.provider === "aws")
      throw new Error("AWS EventBridge is managed by deployment configuration.");
    const { error } = await context.supabase
      .from("provider_connections")
      .delete()
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);
    return { disconnected: data.provider };
  });

async function loadRingSecret(connectionId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { deserializeProviderSecret } = await import("./provider-crypto.server");
  const { data, error } = await supabaseAdmin
    .from("provider_connection_secrets")
    .select("access_token,refresh_token,token_expires_at")
    .eq("connection_id", connectionId)
    .single();
  if (error || !data) throw new Error("Ring credentials are unavailable. Reconnect Ring.");
  return {
    accessToken: deserializeProviderSecret(data.access_token),
    refreshToken: deserializeProviderSecret(data.refresh_token),
    tokenExpiresAt: data.token_expires_at,
  };
}

async function maybeRefreshRingSecret(
  connectionId: string,
  secret: Awaited<ReturnType<typeof loadRingSecret>>,
) {
  if (!secret.tokenExpiresAt || Date.parse(secret.tokenExpiresAt) - Date.now() > 120_000)
    return secret;
  const { refreshRingToken } = await import("./ring.server");
  const { serializeProviderSecret } = await import("./provider-crypto.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const token = await refreshRingToken(secret.refreshToken);
  const next = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token || secret.refreshToken,
    tokenExpiresAt: new Date(Date.now() + (token.expires_in ?? 14_400) * 1000).toISOString(),
  };
  const { error } = await supabaseAdmin
    .from("provider_connection_secrets")
    .update({
      access_token: serializeProviderSecret(next.accessToken),
      refresh_token: serializeProviderSecret(next.refreshToken),
      token_expires_at: next.tokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("connection_id", connectionId);
  if (error) throw new Error(error.message);
  return next;
}

async function persistRingDevices(input: {
  userId: string;
  connectionId: string;
  accountId: string;
  accessToken: string;
  hardwareId: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { discoverRingDevices } = await import("./ring.server");
  const ringDevices = await discoverRingDevices(input.accessToken, input.hardwareId);
  const rows = ringDevices.map((device) => ({
    user_id: input.userId,
    connection_id: input.connectionId,
    provider: "ring" as const,
    external_device_id: device.externalDeviceId,
    name: device.name,
    kind: device.kind,
    model: device.model,
    location: device.location,
    status: device.status,
    capabilities: device.capabilities,
    metadata: {
      ...device.metadata,
      ringAccountId: input.accountId,
    } as import("@/integrations/supabase/types").Json,
    last_seen_at: device.status === "unknown" ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  if (rows.length > 0) {
    const { error } = await supabaseAdmin
      .from("smart_home_devices")
      .upsert(rows, { onConflict: "connection_id,external_device_id" });
    if (error) throw new Error(error.message);
  }
  const { data, error } = await supabaseAdmin
    .from("smart_home_devices")
    .select(
      "id,provider,external_device_id,name,kind,model,location,status,capabilities,last_seen_at",
    )
    .eq("user_id", input.userId)
    .eq("connection_id", input.connectionId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => deviceDto(row));
}

export async function handleRingTokenExchange(request: Request) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { serializeProviderSecret } = await import("./provider-crypto.server");
  const { exchangeRingCode, getRingAccount, newHardwareId } = await import("./ring.server");
  const { ringConfig } = await import("./provider-config.server");
  const form = await request.formData();
  const code = String(form.get("code") ?? "");
  const clientId = String(form.get("client_id") ?? "");
  const config = ringConfig();
  if (!code || clientId !== config.clientId)
    return new Response("Invalid Ring request.", { status: 400 });
  const token = await exchangeRingCode(code, clientId);
  const hardwareId = newHardwareId();
  const account = await getRingAccount(token.access_token, hardwareId);
  const { error } = await supabaseAdmin.from("provider_link_claims").insert({
    provider: "ring",
    external_account_id: account.id,
    access_token: serializeProviderSecret(token.access_token),
    refresh_token: serializeProviderSecret(token.refresh_token),
    token_expires_at: new Date(Date.now() + (token.expires_in ?? 14_400) * 1000).toISOString(),
    scopes: token.scope ? token.scope.split(" ") : [],
    hardware_id: hardwareId,
    metadata: account.metadata as import("@/integrations/supabase/types").Json,
  });
  if (error) throw new Error(error.message);
  return new Response(null, { status: 200 });
}

export async function handleRingLink(request: Request) {
  const url = new URL(request.url);
  const nonce = url.searchParams.get("nonce");
  const time = url.searchParams.get("time");
  const target = new URL("/devices", request.url);
  if (nonce && time) {
    target.searchParams.set("ring_nonce", nonce);
    target.searchParams.set("ring_time", time);
  }
  return Response.redirect(target, 302);
}
