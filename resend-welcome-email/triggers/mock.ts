import { randomUUID } from "node:crypto";

import { getMockConfig } from "../src/config";
import { runWelcomeFlow } from "../src/welcome-flow";

const progressMessages = {
  validating: "Checking test event and environment...",
  generating: "Starting image generation in Bloom...",
  waiting: "Waiting for Bloom to finish the image. This usually takes about a minute.",
  downloading: "Image is ready. Downloading it for the email...",
  sending: "Sending the email with Resend...",
  sent: "Email accepted by Resend.",
} as const;

async function main() {
  const config = getMockConfig();
  const event = {
    id: config.testEventId ?? `mock-user-${randomUUID()}`,
    name: config.testName,
    email: config.testEmail,
    ...(config.extraContext ? { signupContext: config.extraContext } : {}),
  };

  const result = await runWelcomeFlow(event, {
    onProgress: (progress) => console.log(progressMessages[progress.step]),
  });

  console.log("Success: email sent.");
  console.log(JSON.stringify({
    ok: true,
    sentTo: maskEmail(event.email),
    imageUrl: result.imageUrl,
    emailId: result.emailId,
  }, null, 2));
}

function maskEmail(email: string): string {
  return email.replace(/^(.{0,2})[^@]*@/, "$1***@");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
