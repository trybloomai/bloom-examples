export type WelcomeEvent = {
  name: string;
  email: string;
  id?: string;
  [key: string]: unknown;
};

const DEFAULT_MAX_LENGTH = 300;
const RESERVED_EVENT_KEYS = new Set(["name", "email", "id"]);
const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const INSTRUCTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /disregard\s+(all\s+)?previous\s+instructions?/gi,
  /\b(system|developer|assistant|user)\s*:/gi,
  /<\s*\/?\s*(script|style|iframe)[^>]*>/gi,
];

export function buildPrompt(event: WelcomeEvent): string {
  const name = sanitizeForPrompt(event.name, 80);
  const extraContext = getExtraContext(event);

  return [
    "Create a brand-aware welcome email hero image for a new customer.",
    "",
    "Render this exact headline as readable text inside the image:",
    `"Welcome, ${name}"`,
    "",
    "Use the brand identity from the provided brand session. Make the image warm, polished, and suitable as the top hero of a transactional welcome email.",
    "Do not include extra copy, coupons, product claims, or placeholder logos.",
    extraContext ? `\nAdditional signup context:\n${extraContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function sanitizeForPrompt(value: string, maxLength = DEFAULT_MAX_LENGTH): string {
  const withoutInstructions = INSTRUCTION_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, ""),
    value
  );

  return withoutInstructions
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLength);
}

function getExtraContext(event: WelcomeEvent): string {
  const lines: string[] = [];

  for (const [rawKey, rawValue] of Object.entries(event)) {
    if (RESERVED_EVENT_KEYS.has(rawKey) || UNSAFE_OBJECT_KEYS.has(rawKey)) {
      continue;
    }

    const value = stringifyContextValue(rawValue);
    if (!value) {
      continue;
    }

    const key = sanitizeForPrompt(rawKey, 50);
    if (!key) {
      continue;
    }

    lines.push(`- ${key}: ${sanitizeForPrompt(value, 240)}`);
  }

  return lines.join("\n");
}

function stringifyContextValue(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : undefined;
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

