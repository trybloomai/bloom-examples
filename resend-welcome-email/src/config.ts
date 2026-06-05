import "dotenv/config";

export const VALID_ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;

export type AspectRatio = (typeof VALID_ASPECT_RATIOS)[number];

export type AppConfig = {
  bloomApiKey: string;
  bloomApiUrl: string;
  bloomBrandSessionId: string;
  bloomAspectRatio: AspectRatio;
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

type ConfigOptions = {
  includeMock?: boolean;
};

export function getConfig(options: ConfigOptions & { includeMock: true }): AppConfig & MockConfig;
export function getConfig(options?: ConfigOptions): AppConfig;
export function getConfig(options: ConfigOptions = {}): AppConfig | (AppConfig & MockConfig) {
  const missing = getMissingEnv([
    "BLOOM_API_KEY",
    "BLOOM_BRAND_SESSION_ID",
    "RESEND_API_KEY",
    ...(options.includeMock ? ["TEST_EMAIL"] : []),
  ]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env and fill them in.`
    );
  }

  const bloomAspectRatio = parseAspectRatio(env("BLOOM_ASPECT_RATIO") || "16:9");
  const bloomTimeoutMs = parsePositiveInteger(env("BLOOM_TIMEOUT_MS") || "120000", "BLOOM_TIMEOUT_MS");
  const bloomApiUrl = parseHttpUrl(env("BLOOM_API_URL") || "https://www.trybloom.ai/api/v1", "BLOOM_API_URL");

  const appConfig: AppConfig = {
    bloomApiKey: requiredEnv("BLOOM_API_KEY"),
    bloomApiUrl,
    bloomBrandSessionId: requiredEnv("BLOOM_BRAND_SESSION_ID"),
    bloomAspectRatio,
    bloomTimeoutMs,
    resendApiKey: requiredEnv("RESEND_API_KEY"),
    fromEmail: env("FROM_EMAIL") || "onboarding@resend.dev",
    emailSubject: env("EMAIL_SUBJECT") || "Welcome!",
  };

  if (!options.includeMock) {
    return appConfig;
  }

  return {
    ...appConfig,
    testEmail: requiredEnv("TEST_EMAIL"),
    testName: env("TEST_NAME") || "Maria",
    testEventId: env("TEST_EVENT_ID"),
    extraContext: env("EXTRA_CONTEXT") || undefined,
  };
}

function getMissingEnv(keys: string[]): string[] {
  return keys.filter((key) => !env(key));
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

function parseAspectRatio(value: string): AspectRatio {
  if (VALID_ASPECT_RATIOS.includes(value as AspectRatio)) {
    return value as AspectRatio;
  }
  throw new Error(
    `BLOOM_ASPECT_RATIO must be one of: ${VALID_ASPECT_RATIOS.join(", ")}. Received: ${value}`
  );
}

function parsePositiveInteger(value: string, key: string): number {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${key} must be a positive integer. Received: ${value}`);
  }
  return numberValue;
}

function parseHttpUrl(value: string, key: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL. Received: ${value}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${key} must use http or https. Received: ${value}`);
  }

  return url.toString().replace(/\/$/, "");
}
