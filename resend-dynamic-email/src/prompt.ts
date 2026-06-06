export type EmailEvent = {
  emailType: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  id?: string;
  [key: string]: unknown;
};

const DEFAULT_MAX_LENGTH = 300;
const RESERVED_EVENT_KEYS = new Set([
  "emailType",
  "recipientName",
  "recipientEmail",
  "subject",
  "imageHeadline",
  "bodyText",
  "id",
]);
const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const INSTRUCTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /disregard\s+(all\s+)?previous\s+instructions?/gi,
  /\b(system|developer|assistant|user)\s*:/gi,
  /<\s*\/?\s*(script|style|iframe)[^>]*>/gi,
];

export function buildPrompt(event: EmailEvent): string {
  const emailType = sanitizeForPrompt(event.emailType, 120);
  const recipientName = sanitizeForPrompt(event.recipientName, 80);
  const subject = sanitizeForPrompt(event.subject, 160);
  const bodyText = sanitizeForPrompt(event.bodyText, 240);
  const extraContext = getExtraContext(event);

  return [
    "Create an on-brand hero image for an email.",
    "",
    "Context:",
    `- Email type: ${emailType}`,
    `- Recipient name: ${recipientName}`,
    `- Email subject: ${subject}`,
    `- Email body: ${bodyText}`,
    extraContext ? `\nAdditional context:\n${extraContext}` : "",
    "",
    "\nTask:",
    "Use the provided brand identity for visual style. Create an image suitable as the hero at the top of the email.",
    "Decide whether short in-image text improves the result. If it does, write final concise copy based on the email context. If it does not, make the image text-free.",
    "Avoid small text, fine print, placeholder text, unsupported claims, coupons, or extra body copy.",
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

function getExtraContext(event: EmailEvent): string {
  const lines: string[] = [];

  for (const [rawKey, rawValue] of Object.entries(event)) {
    if (RESERVED_EVENT_KEYS.has(rawKey) || UNSAFE_OBJECT_KEYS.has(rawKey)) {
      continue;
    }

    const value = stringifyContextValue(rawValue);
    if (!value) {
      continue;
    }

    const key = formatContextKey(rawKey);
    if (!key) {
      continue;
    }

    lines.push(`- ${key}: ${sanitizeForPrompt(value, 240)}`);
  }

  return lines.join("\n");
}

function formatContextKey(rawKey: string): string {
  if (rawKey === "extraContext") {
    return "Image guidance";
  }

  return sanitizeForPrompt(rawKey, 50);
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
