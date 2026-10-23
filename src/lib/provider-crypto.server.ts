import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

type EncryptedSecret = {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
};

function encryptionKey() {
  const raw = process.env["PROVIDER_TOKEN_ENCRYPTION_KEY"];
  if (!raw) {
    throw new Error(
      "Missing PROVIDER_TOKEN_ENCRYPTION_KEY. Configure a 32-byte server-only key before connecting a provider.",
    );
  }

  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("PROVIDER_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return key;
}

export function encryptProviderSecret(value: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    version: 1,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };
}

export function decryptProviderSecret(secret: EncryptedSecret): string {
  if (secret.version !== 1) throw new Error("Unsupported provider secret version.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(secret.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(secret.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function serializeProviderSecret(value: string) {
  return JSON.stringify(encryptProviderSecret(value));
}

export function deserializeProviderSecret(value: string) {
  return decryptProviderSecret(JSON.parse(value) as EncryptedSecret);
}
