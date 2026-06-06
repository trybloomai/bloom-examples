import type { AppConfig } from "./config";

export type CompletedImage = {
  generationId: string;
  imageUrl: string;
};

type BloomGenerateResponse = {
  data?: {
    ids?: string[];
    imageIds?: string[];
    status?: string;
  };
};

type BloomGetImageResponse = {
  data?: {
    id?: string;
    status?: string | null;
    imageUrl?: string | null;
  };
};

type BloomErrorResponse = {
  error?: {
    code?: string;
    status?: number;
    message?: string;
  };
};

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const IMAGE_FETCH_TIMEOUT_MS = 30_000;

export async function generateImage(prompt: string, config: AppConfig): Promise<string> {
  const json = await bloomFetch<BloomGenerateResponse>(
    config,
    "images/generations",
    {
      method: "POST",
      body: JSON.stringify({
        prompt,
        brandSessionId: config.bloomBrandSessionId,
        model: "pro",
        variantCount: 1,
        imageSize: "2K",
        aspectRatio: config.bloomAspectRatio,
      }),
    },
    config.bloomTimeoutMs
  );

  const ids = json.data?.ids ?? json.data?.imageIds;
  const generationId = ids?.[0];
  if (!generationId) {
    throw new Error("Bloom generation response did not include an image id.");
  }

  return generationId;
}

export async function waitForImage(generationId: string, config: AppConfig): Promise<CompletedImage> {
  // The API rejects a `timeout` query above 295s. Cap the server-side poll wait
  // there, independent of how long the client is willing to wait (bloomTimeoutMs)
  // — otherwise raising BLOOM_TIMEOUT_MS past 295000 makes the request 400.
  const MAX_WAIT_SECONDS = 295;
  const timeoutSeconds = Math.min(
    MAX_WAIT_SECONDS,
    Math.max(1, Math.ceil(config.bloomTimeoutMs / 1000))
  );
  const json = await bloomFetch<BloomGetImageResponse>(
    config,
    `images/${encodeURIComponent(generationId)}?wait=true&timeout=${timeoutSeconds}`,
    { method: "GET" },
    config.bloomTimeoutMs + 5_000
  );

  const status = json.data?.status;
  if (status === "failed") {
    throw new Error(`Bloom image generation failed for image ${generationId}.`);
  }

  const imageUrl = json.data?.imageUrl;
  if (status !== "completed" || !imageUrl) {
    throw new Error(
      `Bloom image ${generationId} was not ready after waiting. Status: ${status ?? "unknown"}.`
    );
  }

  return { generationId, imageUrl };
}

export async function fetchImageBuffer(imageUrl: string, config: AppConfig): Promise<Buffer> {
  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to download Bloom image: ${response.status} ${response.statusText}`);
  }

  const declaredLength = response.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_IMAGE_BYTES) {
    throw new Error(`Bloom image is too large to attach: ${declaredLength} bytes.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`Bloom image is too large to attach: ${buffer.byteLength} bytes.`);
  }
  return buffer;
}

async function bloomFetch<T>(
  config: AppConfig,
  path: string,
  init: RequestInit,
  timeoutMs: number
): Promise<T> {
  const response = await fetch(toBloomUrl(config.bloomApiUrl, path), {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-api-key": config.bloomApiKey,
      ...init.headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  const json = (await readJson(response)) as T & BloomErrorResponse;
  if (!response.ok) {
    throw new Error(formatBloomError(response, json));
  }

  return json;
}

function toBloomUrl(apiUrl: string, path: string): string {
  const base = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;
  return new URL(path, base).toString();
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function formatBloomError(response: Response, json: BloomErrorResponse): string {
  const code = json.error?.code;
  const message = json.error?.message;
  const detail = code || message ? `${code ?? "ERROR"}: ${message ?? response.statusText}` : response.statusText;
  return `Bloom API request failed (${response.status}): ${detail}`;
}
