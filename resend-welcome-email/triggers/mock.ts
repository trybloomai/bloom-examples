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
        imageUrl: result.imageUrl,
        emailId: result.emailId,
      },
      null,
      2
    )
  );
}

class ProgressReporter {
  private readonly startedAt = Date.now();
  private waitingInterval: NodeJS.Timeout | undefined;

  constructor(private readonly timeoutMs: number) {}

  update(progress: WelcomeFlowProgress): void {
    this.stopWaitingUpdates();

    if (progress.step === "validating") {
      this.log("Checking test event and environment...");
      return;
    }

    if (progress.step === "generating") {
      this.log("Starting image generation in Bloom...");
      return;
    }

    if (progress.step === "waiting") {
      this.log("Waiting for Bloom to finish the image. This usually takes about a minute.");
      this.waitingInterval = setInterval(() => {
        this.log(`Still waiting for Bloom... ${this.formatElapsed()}`);
      }, 10_000);
      return;
    }

    if (progress.step === "downloading") {
      this.log("Image is ready. Downloading it for the email...");
      return;
    }

    if (progress.step === "sending") {
      this.log("Sending the email with Resend...");
      return;
    }

    if (progress.step === "sent") {
      this.log("Email accepted by Resend.");
    }
  }

  stop(message: string): void {
    this.stopWaitingUpdates();
    this.log(`Success: ${message}`);
  }

  fail(message: string): void {
    this.stopWaitingUpdates();
    this.log(`Error: ${message}`);
  }

  private log(message: string): void {
    process.stderr.write(`${message}\n`);
  }

  private formatElapsed(): string {
    const elapsedSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    const timeoutSeconds = Math.ceil(this.timeoutMs / 1000);
    return `(${elapsedSeconds}s elapsed, timeout ${timeoutSeconds}s)`;
  }

  private stopWaitingUpdates(): void {
    if (this.waitingInterval) {
      clearInterval(this.waitingInterval);
      this.waitingInterval = undefined;
    }
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
