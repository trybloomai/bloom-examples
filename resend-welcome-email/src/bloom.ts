import type { AppConfig } from "./config";

export type GeneratedImage = {
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

export async function waitForImage(generationId: string, config: AppConfig): Promise<GeneratedImage> {
  const timeoutSeconds = Math.max(1, Math.ceil(config.bloomTimeoutMs / 1000));
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
  const url = parseDownloadUrl(imageUrl);
  const headers = shouldSendApiKey(url, config) ? { "x-api-key": config.bloomApiKey } : undefined;
  const response = await fetch(url, {
    headers,
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

  return readBoundedBuffer(response, MAX_IMAGE_BYTES);
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

function parseDownloadUrl(imageUrl: string): URL {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new Error(`Bloom returned an invalid image URL: ${imageUrl}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Bloom image URL must use http or https. Received: ${imageUrl}`);
  }

  return url;
}

function shouldSendApiKey(imageUrl: URL, config: AppConfig): boolean {
  const apiHost = new URL(config.bloomApiUrl).hostname;
  return imageUrl.hostname === apiHost || imageUrl.hostname === "trybloom.ai" || imageUrl.hostname.endsWith(".trybloom.ai");
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

async function readBoundedBuffer(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error(`Bloom image is too large to attach: ${buffer.byteLength} bytes.`);
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error(`Bloom image is too large to attach: streamed more than ${maxBytes} bytes.`);
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

