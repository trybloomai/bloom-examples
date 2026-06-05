import { randomUUID } from "node:crypto";

import { getConfig } from "../src/config";
import { runWelcomeFlow, type WelcomeFlowProgress } from "../src/welcome-flow";
import type { WelcomeEvent } from "../src/prompt";

async function main() {
  const config = getConfig({ includeMock: true });
  const progress = new ProgressReporter(config.bloomTimeoutMs);
  const event: WelcomeEvent = {
    id: config.testEventId ?? `mock-user-${randomUUID()}`,
    name: config.testName,
    email: config.testEmail,
    ...(config.extraContext ? { signupContext: config.extraContext } : {}),
  };

  let result;
  try {
    result = await runWelcomeFlow(event, {
      onProgress: (update) => progress.update(update),
    });
    progress.stop("Email sent successfully");
  } catch (error) {
    progress.fail("Welcome flow failed");
    throw error;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        sentTo: maskEmail(event.email),
        brandSessionId: result.brandSessionId,
        generationId: result.generationId,
        imageUrl: result.imageUrl,
        emailId: result.emailId,
      },
      null,
      2
    )
  );
}

class ProgressReporter {
  private readonly frames = ["-", "\\", "|", "/"];
  private readonly startedAt = Date.now();
  private interval: NodeJS.Timeout | undefined;
  private frameIndex = 0;
  private message = "Starting";
  private generationId: string | undefined;

  constructor(private readonly timeoutMs: number) {}

  update(progress: WelcomeFlowProgress): void {
    this.message = progress.message;
    this.generationId = "generationId" in progress ? progress.generationId : this.generationId;

    if (!process.stderr.isTTY) {
      this.logLine(progress);
      return;
    }

    if (!this.interval) {
      this.interval = setInterval(() => this.render(), 120);
    }
    this.render();
  }

  stop(message: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    if (process.stderr.isTTY) {
      process.stderr.write(`\rOK ${message}${" ".repeat(40)}\n`);
    } else {
      process.stderr.write(`OK ${message}\n`);
    }
  }

  fail(message: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    if (process.stderr.isTTY) {
      process.stderr.write(`\rERROR ${message}${" ".repeat(40)}\n`);
    } else {
      process.stderr.write(`ERROR ${message}\n`);
    }
  }

  private render(): void {
    const frame = this.frames[this.frameIndex % this.frames.length];
    this.frameIndex += 1;

    process.stderr.write(
      `\r${frame} ${this.message} ${this.formatElapsed()}${this.formatGenerationId()}`
    );
  }

  private logLine(progress: WelcomeFlowProgress): void {
    process.stderr.write(`${progress.message}${this.formatGenerationId()}\n`);
  }

  private formatElapsed(): string {
    const elapsedSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    const timeoutSeconds = Math.ceil(this.timeoutMs / 1000);
    return `(${elapsedSeconds}s elapsed, timeout ${timeoutSeconds}s)`;
  }

  private formatGenerationId(): string {
    return this.generationId ? ` [${this.generationId}]` : "";
  }
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "***";
  }

  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"*".repeat(Math.max(1, localPart.length - visible.length))}@${domain}`;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
