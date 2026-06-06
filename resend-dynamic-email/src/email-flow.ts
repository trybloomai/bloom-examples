import { randomUUID } from "node:crypto";
import React from "react";
import { Resend } from "resend";

import { fetchImageBuffer, generateImage, waitForImage } from "./bloom";
import { getAppConfig } from "./config";
import { EmailTemplate } from "./emails/email-template";
import { buildPrompt, type EmailEvent } from "./prompt";

const IMAGE_CID = "email-hero";

export type EmailFlowResult = {
  brandSessionId: string;
  generationId: string;
  imageUrl: string;
  emailId: string;
};

export type EmailFlowProgress =
  | { step: "validating"; message: string }
  | { step: "generating"; message: string }
  | { step: "waiting"; message: string; generationId: string }
  | { step: "downloading"; message: string; generationId: string; imageUrl: string }
  | { step: "sending"; message: string; generationId: string }
  | { step: "sent"; message: string; generationId: string; imageUrl: string; emailId: string };

export type EmailFlowOptions = {
  onProgress?: (progress: EmailFlowProgress) => void;
};

export async function runEmailFlow(
  event: EmailEvent,
  options: EmailFlowOptions = {}
): Promise<EmailFlowResult> {
  options.onProgress?.({ step: "validating", message: "Validating email event" });
  validateEmailEvent(event);

  const config = getAppConfig();
  const prompt = buildPrompt(event);
  options.onProgress?.({ step: "generating", message: "Starting Bloom image generation" });
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

  options.onProgress?.({ step: "sending", message: "Sending email with Resend", generationId });
  const resend = new Resend(config.resendApiKey);
  const result = await resend.emails.send(
    {
      from: config.fromEmail,
      to: event.recipientEmail,
      subject: event.subject,
      headers: {
        "X-Entity-Ref-ID": event.id ?? randomUUID(),
      },
      react: React.createElement(EmailTemplate, {
        recipientName: event.recipientName,
        bodyText: event.bodyText,
        imageCid: IMAGE_CID,
      }),
      attachments: [
        {
          filename: "email-hero.png",
          content: imageBuffer,
          contentType: "image/png",
          contentId: IMAGE_CID,
        },
      ],
    },
    event.id ? { idempotencyKey: event.id } : undefined
  );

  if (result.error) {
    throw new Error(`Resend failed to send the email: ${result.error.message}`);
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

function validateEmailEvent(event: EmailEvent): void {
  if (!hasText(event.emailType)) {
    throw new Error("Email event is missing an emailType.");
  }

  if (!hasText(event.recipientName)) {
    throw new Error("Email event is missing a recipientName.");
  }

  if (!isValidEmail(event.recipientEmail)) {
    throw new Error(`Email event has an invalid recipientEmail: ${event.recipientEmail}`);
  }

  if (!hasText(event.subject)) {
    throw new Error("Email event is missing a subject.");
  }

  if (!hasText(event.bodyText)) {
    throw new Error("Email event is missing bodyText.");
  }
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
