import { createHmac, createHash } from "node:crypto";
import { awsConfig } from "./provider-config.server";

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function awsCredentials() {
  const accessKeyId = process.env["AWS_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY. Configure an IAM role or service identity for EventBridge.",
    );
  }
  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: process.env["AWS_SESSION_TOKEN"],
  };
}

export async function publishProviderEvent(input: {
  eventType: string;
  detail: Record<string, unknown>;
  eventId: string;
  accountId?: string;
}) {
  const config = awsConfig();
  const credentials = awsCredentials();
  const host = `events.${config.region}.amazonaws.com`;
  const service = "events";
  const method = "POST";
  const target = "AWSEvents.PutEvents";
  const body = JSON.stringify({
    Entries: [
      {
        EventBusName: config.eventBusName,
        Source: config.source,
        DetailType: input.eventType,
        Detail: JSON.stringify({
          eventId: input.eventId,
          accountId: input.accountId,
          ...input.detail,
        }),
      },
    ],
  });
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const canonicalHeaders = `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = [method, "/", "", canonicalHeaders, signedHeaders, hash(body)].join(
    "\n",
  );
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hash(canonicalRequest)].join(
    "\n",
  );
  const dateKey = hmac(`AWS4${credentials.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, config.region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const headers: Record<string, string> = {
    "Content-Type": "application/x-amz-json-1.1",
    Host: host,
    "X-Amz-Date": amzDate,
    "X-Amz-Target": target,
    Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
  if (credentials.sessionToken) headers["X-Amz-Security-Token"] = credentials.sessionToken;

  const response = await fetch(`https://${host}/`, { method, headers, body });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`AWS EventBridge rejected the event: HTTP ${response.status}.`);
  }
  const payload = responseText ? (JSON.parse(responseText) as { FailedEntryCount?: number }) : {};
  if ((payload.FailedEntryCount ?? 0) > 0) {
    throw new Error("AWS EventBridge reported a failed event entry.");
  }
  return payload;
}
