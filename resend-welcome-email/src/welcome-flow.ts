import { randomUUID } from "node:crypto";
import React from "react";
import { Resend } from "resend";

import { fetchImageBuffer, generateImage, waitForImage } from "./bloom";
import { getAppConfig } from "./config";
import { WelcomeEmail } from "./emails/welcome-email";
import { buildPrompt, type WelcomeEvent } from "./prompt";

const IMAGE_CID = "welcome-hero";

export type WelcomeFlowResult = {
  brandSessionId: string;
  generationId: string;
  imageUrl: string;
  emailId: string;
};

export type WelcomeFlowProgress =
  | { step: "validating"; message: string }
  | { step: "generating"; message: string }
  | { step: "waiting"; message: string; generationId: string }
  | { step: "downloading"; message: string; generationId: string; imageUrl: string }
  | { step: "sending"; message: string; generationId: string }
  | { step: "sent"; message: string; generationId: string; imageUrl: string; emailId: string };

export type WelcomeFlowOptions = {
  onProgress?: (progress: WelcomeFlowProgress) => void;
};

export async function runWelcomeFlow(
  event: WelcomeEvent,
  options: WelcomeFlowOptions = {}
): Promise<WelcomeFlowResult> {
  options.onProgress?.({
    step: "validating",
    message: "Validating welcome event",
  });
  validateWelcomeEvent(event);

  const config = getAppConfig();
  const prompt = buildPrompt(event);
  options.onProgress?.({
    step: "generating",
    message: "Starting Bloom image generation",
  });
  const generationId = await generateImage(prompt, config);
  options.onProgress?.({
    step: "waiting",
    message: "Waiting for Bloom to finish the image",
    generationId,
  });
  const { imageUrl } = await waitForImage(generationId, config);
  options.onProgress?.({
    step: "downloading",
    message: "Downloading generated image",
    generationId,
    imageUrl,
  });
  const imageBuffer = await fetchImageBuffer(imageUrl, config);

  options.onProgress?.({
    step: "sending",
    message: "Sending email with Resend",
    generationId,
  });
  const resend = new Resend(config.resendApiKey);
  const result = await resend.emails.send(
    {
      from: config.fromEmail,
      to: event.email,
      subject: config.emailSubject,
      headers: {
        "X-Entity-Ref-ID": event.id ?? randomUUID(),
      },
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

  options.onProgress?.({
    step: "sent",
    message: "Email sent",
    generationId,
    imageUrl,
    emailId: result.data.id,
  });

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
