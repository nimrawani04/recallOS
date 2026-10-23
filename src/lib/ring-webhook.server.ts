import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { publishProviderEvent } from "./aws-eventbridge.server";
import { verifyRingWebhook } from "./ring.server";

export async function handleRingWebhook(request: Request) {
  const payload = await request.text();
  if (!verifyRingWebhook(payload, request.headers.get("x-signature"))) {
    return new Response("Invalid Ring signature.", { status: 401 });
  }

  const parsed = JSON.parse(payload) as Record<string, unknown>;
  const eventId = String(parsed["id"] ?? parsed["event_id"] ?? crypto.randomUUID());
  let eventType = String(parsed["type"] ?? parsed["event_type"] ?? "ring.event");
  const { error } = await supabaseAdmin.from("provider_webhook_events").insert({
    provider: "ring",
    event_id: eventId,
    event_type: eventType,
    payload: parsed as import("@/integrations/supabase/types").Json,
  });
  let alreadyPublished = false;
  if (error && error.message.toLowerCase().includes("duplicate")) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("provider_webhook_events")
      .select("event_type,payload,published_at")
      .eq("provider", "ring")
      .eq("event_id", eventId)
      .maybeSingle();
    if (existingError) {
      console.error("Ring webhook idempotency lookup failed", existingError.message);
      return new Response("Webhook idempotency lookup failed.", { status: 500 });
    }
    if (!existing) return new Response("Webhook event disappeared.", { status: 500 });
    alreadyPublished = Boolean(existing.published_at);
    eventType = existing.event_type;
    if (
      existing.payload &&
      typeof existing.payload === "object" &&
      !Array.isArray(existing.payload)
    ) {
      Object.assign(parsed, existing.payload);
    }
  } else if (error) {
    console.error("Ring webhook persistence failed", error.message);
    return new Response("Webhook persistence failed.", { status: 500 });
  }

  if (!alreadyPublished) {
    try {
      await publishProviderEvent({
        eventId,
        eventType,
        ...(typeof parsed["account_id"] === "string" ? { accountId: parsed["account_id"] } : {}),
        detail: parsed,
      });
      const { error: markPublishedError } = await supabaseAdmin
        .from("provider_webhook_events")
        .update({ published_at: new Date().toISOString() })
        .eq("provider", "ring")
        .eq("event_id", eventId);
      if (markPublishedError) {
        console.error("Ring webhook publish receipt failed", markPublishedError.message);
        return new Response("Event bridge receipt failed.", { status: 503 });
      }
    } catch (publishError) {
      console.error("AWS EventBridge publish failed", publishError);
      return new Response("Event bridge publish failed.", { status: 503 });
    }
  }
  return new Response(null, { status: 200 });
}
