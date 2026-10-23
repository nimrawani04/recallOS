import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { decryptProviderSecret, encryptProviderSecret } from "@/lib/provider-crypto.server";
import { verifyRingWebhook } from "@/lib/ring.server";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("provider integration security", () => {
  it("encrypts provider tokens with authenticated encryption", () => {
    process.env["PROVIDER_TOKEN_ENCRYPTION_KEY"] = "11".repeat(32);
    const encrypted = encryptProviderSecret("ring-access-token");

    expect(encrypted.ciphertext).not.toContain("ring-access-token");
    expect(decryptProviderSecret(encrypted)).toBe("ring-access-token");
  });

  it("accepts only Ring webhooks signed with the configured HMAC key", () => {
    process.env["RING_CLIENT_ID"] = "client";
    process.env["RING_CLIENT_SECRET"] = "secret";
    process.env["RING_HMAC_SIGNING_KEY"] = "hmac-key";
    process.env["RING_APPSTORE_URL"] = "https://ring.example/app";
    const payload = JSON.stringify({ id: "event-1", type: "motion_detected" });
    const signature = createHmac("sha256", "hmac-key").update(payload).digest("hex");

    expect(verifyRingWebhook(payload, `sha256=${signature}`)).toBe(true);
    expect(verifyRingWebhook(payload, `sha256=${"00".repeat(32)}`)).toBe(false);
  });
});
