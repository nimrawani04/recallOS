export type ProviderConfig = {
  appBaseUrl: string;
  ring: {
    clientId: string;
    clientSecret: string;
    hmacKey: string;
    appstoreUrl: string;
    apiBaseUrl: string;
    tokenUrl: string;
    userAgent: string;
  };
  aws: {
    region: string;
    eventBusName: string;
    source: string;
  };
  alexa: {
    skillId: string;
    skillUrl: string;
    clientId: string;
    clientSecret: string;
    tokenTtlSeconds: number;
    allowedRedirectUris: string[];
  };
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. Configure the provider integration first.`);
  return value;
}

function optional(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

export function appBaseUrl() {
  return required("APP_BASE_URL").replace(/\/$/, "");
}

export function ringConfig(): ProviderConfig["ring"] {
  return {
    clientId: required("RING_CLIENT_ID"),
    clientSecret: required("RING_CLIENT_SECRET"),
    hmacKey: required("RING_HMAC_SIGNING_KEY"),
    appstoreUrl: required("RING_APPSTORE_URL"),
    apiBaseUrl: optional("RING_API_BASE_URL", "https://api.amazonvision.com"),
    tokenUrl: optional("RING_TOKEN_URL", "https://oauth.ring.com/oauth/token"),
    userAgent: optional("RING_USER_AGENT", "RecallOS/1.0"),
  };
}

export function awsConfig(): ProviderConfig["aws"] {
  return {
    region: required("AWS_REGION"),
    eventBusName: required("AWS_EVENT_BUS_NAME"),
    source: optional("AWS_EVENT_SOURCE", "recallos.ring"),
  };
}

export function awsCredentialsConfigured() {
  return Boolean(process.env["AWS_ACCESS_KEY_ID"] && process.env["AWS_SECRET_ACCESS_KEY"]);
}

export function alexaConfig(): ProviderConfig["alexa"] {
  const skillId = required("ALEXA_SKILL_ID");
  return {
    skillId,
    skillUrl: optional(
      "ALEXA_SKILL_URL",
      `https://alexa.amazon.com/spa/index.html#skills/dp/${encodeURIComponent(skillId)}`,
    ),
    clientId: required("ALEXA_ACCOUNT_LINKING_CLIENT_ID"),
    clientSecret: required("ALEXA_ACCOUNT_LINKING_CLIENT_SECRET"),
    tokenTtlSeconds: Number(process.env["ALEXA_TOKEN_TTL_SECONDS"] ?? 3600),
    allowedRedirectUris: (process.env["ALEXA_ALLOWED_REDIRECT_URIS"] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

export function providerConfig(): ProviderConfig {
  return { appBaseUrl: appBaseUrl(), ring: ringConfig(), aws: awsConfig(), alexa: alexaConfig() };
}

export function configuredProviderNames() {
  const names: string[] = [];
  if (
    process.env["RING_CLIENT_ID"] &&
    process.env["RING_CLIENT_SECRET"] &&
    process.env["RING_HMAC_SIGNING_KEY"] &&
    process.env["RING_APPSTORE_URL"]
  ) {
    names.push("Ring");
  }
  if (process.env["AWS_REGION"] && process.env["AWS_EVENT_BUS_NAME"]) names.push("AWS EventBridge");
  if (
    process.env["ALEXA_SKILL_ID"] &&
    process.env["ALEXA_ACCOUNT_LINKING_CLIENT_ID"] &&
    process.env["ALEXA_ACCOUNT_LINKING_CLIENT_SECRET"]
  ) {
    names.push("Alexa Smart Home");
  }
  return names;
}
