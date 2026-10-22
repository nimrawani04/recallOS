/**
 * Ambient Guard Layer (inspired by andywongpt-my/ambient-guard & Sovereign Alexa)
 * Redacts sensitive PII, credentials, and ambient background chatter
 * before conversations enter memory extraction or the knowledge vault.
 */

export interface RedactionResult {
  sanitized: string;
  redactedCount: number;
  categories: Record<string, number>;
  auditLog: Array<{ type: string; masked: string; index: number }>;
}

const REDACTION_PATTERNS: Array<{ type: string; regex: RegExp; replaceWith: string }> = [
  // API Keys, Secrets & Tokens
  {
    type: "api_key",
    regex:
      /(?:sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{30,}|aws_secret_access_key\s*=\s*[a-zA-Z0-9/+]{40}|Bearer\s+[a-zA-Z0-9._-]{20,})/gi,
    replaceWith: "[REDACTED_API_KEY]",
  },
  // Passwords / Passcodes
  {
    type: "password",
    regex: /(?:password|passcode|pin\s*code|secret)[:=\s]+["']?([^\s"',;]{4,})["']?/gi,
    replaceWith: "password: [REDACTED_SECRET]",
  },
  // Credit Card Numbers
  {
    type: "credit_card",
    regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    replaceWith: "[REDACTED_CARD_NUMBER]",
  },
  // SSN / National IDs
  {
    type: "ssn",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replaceWith: "[REDACTED_SSN]",
  },
  // Phone numbers
  {
    type: "phone",
    regex: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replaceWith: "[REDACTED_PHONE]",
  },
  // Email addresses
  {
    type: "email",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g,
    replaceWith: "[REDACTED_EMAIL]",
  },
  // Ambient background speech noise markers
  {
    type: "ambient_noise",
    regex:
      /\[(?:background noise|tv playing|ambient chatter|unrelated music|dog barking)[^\]]*\]/gi,
    replaceWith: "[AMBIENT_IGNORED]",
  },
];

export function applyAmbientGuard(transcript: string): RedactionResult {
  let sanitized = transcript;
  let redactedCount = 0;
  const categories: Record<string, number> = {};
  const auditLog: Array<{ type: string; masked: string; index: number }> = [];

  for (const { type, regex, replaceWith } of REDACTION_PATTERNS) {
    const matches = Array.from(sanitized.matchAll(regex));
    if (matches.length > 0) {
      redactedCount += matches.length;
      categories[type] = (categories[type] ?? 0) + matches.length;

      for (const m of matches) {
        auditLog.push({
          type,
          masked: replaceWith,
          index: m.index ?? 0,
        });
      }

      sanitized = sanitized.replaceAll(regex, replaceWith);
    }
  }

  return { sanitized, redactedCount, categories, auditLog };
}
