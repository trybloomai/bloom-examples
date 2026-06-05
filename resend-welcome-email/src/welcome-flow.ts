import React from "react";
import { Resend } from "resend";

import { fetchImageBuffer, generateImage, waitForImage } from "./bloom";
import { getConfig } from "./config";
import { WelcomeEmail } from "./emails/welcome-email";
import { buildPrompt, type WelcomeEvent } from "./prompt";

const IMAGE_CID = "welcome-hero";

export type WelcomeFlowResult = {
  brandSessionId: string;
  generationId: string;
  imageUrl: string;
  emailId: string;
};

export async function runWelcomeFlow(event: WelcomeEvent): Promise<WelcomeFlowResult> {
  validateWelcomeEvent(event);

  const config = getConfig();
  const prompt = buildPrompt(event);
  const generationId = await generateImage(prompt, config);
  const { imageUrl } = await waitForImage(generationId, config);
  const imageBuffer = await fetchImageBuffer(imageUrl, config);

  const resend = new Resend(config.resendApiKey);
  const result = await resend.emails.send(
    {
      from: config.fromEmail,
      to: event.email,
      subject: config.emailSubject,
      react: React.createElement(WelcomeEmail, {
        name: event.name,
        imageCid: IMAGE_CID,
      }),
      attachments: [
        {
          filename: "welcome-hero.png",
          content: imageBuffer,
          contentType: "image/png",
          contentId: IMAGE_CID,
        },
      ],
    },
    event.id ? { idempotencyKey: event.id } : undefined
  );

  if (result.error) {
    throw new Error(`Resend failed to send the welcome email: ${result.error.message}`);
  }

  if (!result.data?.id) {
    throw new Error("Resend did not return an email id.");
  }

  return {
    brandSessionId: config.bloomBrandSessionId,
    generationId,
    imageUrl,
    emailId: result.data.id,
  };
}

function validateWelcomeEvent(event: WelcomeEvent): void {
  if (!event.name.trim()) {
    throw new Error("Welcome event is missing a name.");
  }

  if (!isValidEmail(event.email)) {
    throw new Error(`Welcome event has an invalid email address: ${event.email}`);
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

