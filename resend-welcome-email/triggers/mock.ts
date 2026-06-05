import { getConfig } from "../src/config";
import { runWelcomeFlow } from "../src/welcome-flow";
import type { WelcomeEvent } from "../src/prompt";

async function main() {
  const config = getConfig({ includeMock: true });
  const event: WelcomeEvent = {
    id: `mock-user-${config.testEmail.toLowerCase()}`,
    name: config.testName,
    email: config.testEmail,
    ...(config.extraContext ? { signupContext: config.extraContext } : {}),
  };

  const result = await runWelcomeFlow(event);

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

