import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { ringConfig } from "./provider-config.server";

type RingTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export type RingDeviceDto = {
  externalDeviceId: string;
  name: string;
  kind: "doorbell" | "camera" | "light" | "sensor" | "chime";
  model: string;
  location: string;
  status: "online" | "offline" | "unknown";
  capabilities: string[];
  metadata: Record<string, unknown>;
};

function ringHeaders(accessToken: string, hardwareId: string) {
  const config = ringConfig();
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "User-Agent": config.userAgent,
    Hardware_Id: hardwareId,
  };
}

async function ringJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.text();
  let payload: unknown = undefined;
  try {
    payload = body ? JSON.parse(body) : undefined;
  } catch {
    payload = undefined;
  }
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "errors" in payload
        ? JSON.stringify((payload as { errors: unknown }).errors)
        : `HTTP ${response.status}`;
    throw new Error(`Ring API request failed: ${detail}`);
  }
  return payload as T;
}

export async function exchangeRingCode(code: string, clientId: string) {
  const config = ringConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    client_secret: config.clientSecret,
  });
  return ringJson<RingTokenResponse>(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

export async function refreshRingToken(refreshToken: string) {
  const config = ringConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  return ringJson<RingTokenResponse>(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

export async function getRingAccount(accessToken: string, hardwareId: string) {
  const config = ringConfig();
  const payload = await ringJson<{ data?: { id?: string; attributes?: Record<string, unknown> } }>(
    `${config.apiBaseUrl}/v1/users/me`,
    { headers: ringHeaders(accessToken, hardwareId) },
  );
  const id = payload.data?.id ?? (payload.data?.attributes?.["account_id"] as string | undefined);
  if (!id) throw new Error("Ring did not return an account ID.");
  return { id, metadata: payload.data?.attributes ?? {} };
}

export async function discoverRingDevices(accessToken: string, hardwareId: string) {
  const config = ringConfig();
  const payload = await ringJson<{ data?: Array<Record<string, unknown>> }>(
    `${config.apiBaseUrl}/v1/devices?include=status,capabilities,location,configurations`,
    { headers: ringHeaders(accessToken, hardwareId) },
  );
  return (payload.data ?? []).map(normalizeRingDevice).filter((device) => device.externalDeviceId);
}

function nestedRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(...values: unknown[]) {
  return (
    values.find((value): value is string => typeof value === "string" && value.trim().length > 0) ??
    ""
  );
}

function normalizeRingDevice(raw: Record<string, unknown>): RingDeviceDto {
  const attributes = nestedRecord(raw["attributes"]);
  const relationships = nestedRecord(raw["relationships"]);
  const type = stringValue(
    raw["type"],
    attributes["type"],
    attributes["kind"],
    attributes["device_type"],
  ).toLowerCase();
  const name =
    stringValue(
      attributes["description"],
      attributes["name"],
      attributes["device_name"],
      raw["name"],
    ) || "Ring device";
  const model =
    stringValue(attributes["product_name"], attributes["model"], attributes["kind"], raw["type"]) ||
    "Ring device";
  const location =
    stringValue(
      attributes["location_name"],
      nestedRecord(attributes["location"])["name"],
      nestedRecord(relationships["location"])["name"],
    ) || "Ring home";
  const statusValue = stringValue(
    nestedRecord(attributes["status"])["status"],
    attributes["status"],
    attributes["online"],
  ).toLowerCase();
  const capabilities = Array.from(
    new Set(
      [
        ...stringArray(attributes["capabilities"]),
        ...stringArray(nestedRecord(attributes["capabilities"])["supported"]),
      ].filter(Boolean),
    ),
  );
  return {
    externalDeviceId: stringValue(raw["id"], attributes["id"]),
    name,
    kind: type.includes("doorbell")
      ? "doorbell"
      : type.includes("light")
        ? "light"
        : type.includes("chime")
          ? "chime"
          : type.includes("sensor")
            ? "sensor"
            : "camera",
    model,
    location,
    status:
      statusValue === "online" || statusValue === "true"
        ? "online"
        : statusValue === "offline" || statusValue === "false"
          ? "offline"
          : "unknown",
    capabilities,
    metadata: { type, attributes },
  };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (item && typeof item === "object") {
      const label =
        (item as Record<string, unknown>)["name"] ?? (item as Record<string, unknown>)["id"];
      return typeof label === "string" ? [label] : [];
    }
    return [];
  });
}

export function newHardwareId() {
  return randomUUID();
}

export function verifyRingNonce(nonce: string, time: string, accountId: string) {
  const config = ringConfig();
  const timestamp = Number(time);
  if (!Number.isFinite(timestamp)) return false;
  const timestampMs = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  if (Math.abs(Date.now() - timestampMs) > 600_000) return false;
  const expected = createHmac("sha256", config.hmacKey)
    .update(`${time}:${accountId}`)
    .digest("base64url");
  const actualBuffer = Buffer.from(nonce);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function verifyRingWebhook(payload: string, signature: string | null) {
  if (!signature) return false;
  const config = ringConfig();
  const normalized = signature.replace(/^sha256=/, "");
  const expected = createHmac("sha256", config.hmacKey).update(payload).digest("hex");
  const actualBuffer = Buffer.from(normalized, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function confirmRingAppIntegration(accessToken: string, hardwareId: string) {
  const config = ringConfig();
  await ringJson(`${config.apiBaseUrl}/v1/accounts/me/app-integrations`, {
    method: "POST",
    headers: ringHeaders(accessToken, hardwareId),
    body: JSON.stringify({ status: "awaiting" }),
  });
  await ringJson(`${config.apiBaseUrl}/v1/accounts/me/app-integrations`, {
    method: "PATCH",
    headers: ringHeaders(accessToken, hardwareId),
    body: JSON.stringify({ status: "completed" }),
  });
}
