import { randomUUID } from "node:crypto";

import { getMockConfig } from "../src/config";
import { buildPrompt } from "../src/prompt";

const config = getMockConfig();

const prompt = buildPrompt({
  id: config.eventId ?? `preview-email-${randomUUID()}`,
  emailType: config.emailType,
  recipientName: config.recipientName,
  recipientEmail: config.recipientEmail,
  subject: config.subject,
  bodyText: config.bodyText,
  ...(config.extraContext ? { extraContext: config.extraContext } : {}),
});

console.log(prompt);
