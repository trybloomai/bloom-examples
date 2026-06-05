import "dotenv/config";

export type AppConfig = {
  bloomApiKey: string;
  bloomApiUrl: string;
  bloomBrandSessionId: string;
  bloomAspectRatio: string;
  bloomTimeoutMs: number;
  resendApiKey: string;
  fromEmail: string;
  emailSubject: string;
};

export type MockConfig = {
  testEmail: string;
  testName: string;
  testEventId?: string;
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
    emailSubject: env("EMAIL_SUBJECT") || "Welcome!",
  };
}

export function getMockConfig(): MockConfig {
  requireEnv(["TEST_EMAIL"]);

  return {
    testEmail: requiredEnv("TEST_EMAIL"),
    testName: env("TEST_NAME") || "Maria",
    testEventId: env("TEST_EVENT_ID"),
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
