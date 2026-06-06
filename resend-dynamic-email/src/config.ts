import "dotenv/config";

export type AppConfig = {
  bloomApiKey: string;
  bloomApiUrl: string;
  bloomBrandSessionId: string;
  bloomAspectRatio: string;
  bloomTimeoutMs: number;
  resendApiKey: string;
  fromEmail: string;
};

export type MockConfig = {
  recipientEmail: string;
  recipientName: string;
  useCase: string;
  subject: string;
  imageHeadline: string;
  bodyText: string;
  eventId?: string;
  extraContext?: string;
};

export function getAppConfig(): AppConfig {
  requireEnv(["BLOOM_API_KEY", "BLOOM_BRAND_SESSION_ID", "RESEND_API_KEY"]);

  return {
    bloomApiKey: requiredEnv("BLOOM_API_KEY"),
    bloomApiUrl: env("BLOOM_API_URL") || "https://www.trybloom.ai/api/v1",
    bloomBrandSessionId: requiredEnv("BLOOM_BRAND_SESSION_ID"),
    bloomAspectRatio: env("BLOOM_ASPECT_RATIO") || "16:9",
    bloomTimeoutMs: Number(env("BLOOM_TIMEOUT_MS") || "120000"),
    resendApiKey: requiredEnv("RESEND_API_KEY"),
    fromEmail: env("FROM_EMAIL") || "onboarding@resend.dev",
  };
}

export function getMockConfig(): MockConfig {
  requireEnv([
    "RECIPIENT_EMAIL",
    "RECIPIENT_NAME",
    "USE_CASE",
    "SUBJECT",
    "IMAGE_HEADLINE",
    "BODY_TEXT",
  ]);

  return {
    recipientEmail: requiredEnv("RECIPIENT_EMAIL"),
    recipientName: requiredEnv("RECIPIENT_NAME"),
    useCase: requiredEnv("USE_CASE"),
    subject: requiredEnv("SUBJECT"),
    imageHeadline: requiredEnv("IMAGE_HEADLINE"),
    bodyText: requiredEnv("BODY_TEXT"),
    eventId: env("EVENT_ID"),
    extraContext: env("EXTRA_CONTEXT") || undefined,
  };
}

function requireEnv(keys: string[]): void {
  const missing = keys.filter((key) => !env(key));
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env and fill them in.`
    );
  }
}

function requiredEnv(key: string): string {
  const value = env(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}
