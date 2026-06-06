# Bloom + Resend Dynamic Email

Generate an on-brand hero image for any email use case, then send it through Resend.

```text
your trigger -> runEmailFlow(event) -> Bloom image -> Resend email
```

Bloom renders your `imageHeadline` inside the generated image. You pass in the email topic, recipient, subject, and body copy.

## The Only Function You Call

```ts
await runEmailFlow({
  useCase: "welcome email",
  recipientName: "Maria",
  recipientEmail: "maria@example.com",
  subject: "Welcome!",
  imageHeadline: "Welcome, Maria",
  bodyText: "We are glad you are here.",
});
```

Edit `src/prompt.ts` to change how Bloom is prompted. Edit `src/emails/email-template.tsx` to change the email layout.

## Setup

```bash
npx degit trybloomai/bloom-examples/resend-dynamic-email resend-dynamic-email
cd resend-dynamic-email
npm install
cp .env.example .env
```

Fill `.env`:

```env
BLOOM_API_KEY=bloom_sk_...
BLOOM_BRAND_SESSION_ID=...
RESEND_API_KEY=re_...
RECIPIENT_EMAIL=you@example.com
RECIPIENT_NAME=Maria
USE_CASE=welcome email
SUBJECT=Welcome!
IMAGE_HEADLINE=Welcome, Maria
BODY_TEXT=We are glad you are here.
```

Those values power the local demo. Change them to match any email you want to send, or pass real values from your app.

Then run:

```bash
npm run trigger
```

`npm run trigger` calls Bloom and Resend, then sends a real email. The terminal shows each step and never prints API keys.

The email includes a unique `X-Entity-Ref-ID` header so repeated test sends do not collapse into one Gmail thread.

## Required Accounts

- Bloom API key
- Bloom `brandSessionId` for an onboarded brand
- Resend API key
- For Resend sandbox mode, a `RECIPIENT_EMAIL` registered in Resend

## Extra Context

`EXTRA_CONTEXT` is optional. Use it only for quick local tests. It is plain text, not JSON.

```env
EXTRA_CONTEXT=Customer is on the Pro plan; signup source: webinar.
```

In your app, pass fields directly:

```ts
await runEmailFlow({
  id: payload.id,
  useCase: "weekly report",
  recipientName: payload.user.name,
  recipientEmail: payload.user.email,
  subject: "Your weekly report is ready",
  imageHeadline: "Your weekly report is ready",
  bodyText: "Open your report to see the latest results.",
  plan: payload.user.plan,
  reportPeriod: payload.report.period,
});
```

Extra fields are added to the Bloom prompt after simple cleanup. Do not send private customer data unless the image truly needs it.

## Swap In Your Stack

There are two places you will usually edit:

1. Replace `triggers/mock.ts` with the place in your app that should send the email.
2. Replace `src/emails/email-template.tsx` if you already have your own email template.

Keep calling `runEmailFlow(event)`. It checks the input, writes the Bloom prompt, asks Bloom for the image, downloads it, and sends the email.

Example route handler:

```ts
import { runEmailFlow } from "./src/email-flow";

export async function POST(request: Request) {
  const payload = await request.json();

  await runEmailFlow({
    id: payload.id,
    useCase: payload.type,
    recipientName: payload.user.name,
    recipientEmail: payload.user.email,
    subject: payload.email.subject,
    imageHeadline: payload.email.imageHeadline,
    bodyText: payload.email.bodyText,
  });

  return Response.json({ ok: true });
}
```

Pass an `event.id` when your app already has one. Resend uses it to avoid sending the same email twice.

`event.id` is also used for the hidden `X-Entity-Ref-ID` email header, which helps Gmail keep repeated test emails as separate conversations. If there is no `event.id`, the example creates one.

## Point Your Agent At This

Copy this example into your project and let your coding agent wire it up:

```text
Integrate trybloomai/bloom-examples/resend-dynamic-email into my app.
Replace triggers/mock.ts with my real webhook, queue worker, or product event.
Call runEmailFlow({ useCase, recipientName, recipientEmail, subject, imageHeadline, bodyText }) from that trigger.
Keep using runEmailFlow and do not remove the cleanup in src/prompt.ts.
Keep my existing email-sending setup if I already have one.
```

Works with Claude Code, Cursor, or any coding agent with repo access.

## Advanced Environment

Keep `.env.example` to the required values. Add these only when you need them:

```env
BLOOM_API_URL=https://www.trybloom.ai/api/v1
BLOOM_ASPECT_RATIO=16:9
BLOOM_TIMEOUT_MS=120000
FROM_EMAIL=onboarding@resend.dev
EVENT_ID=
EXTRA_CONTEXT=
```

`EVENT_ID` is only needed when you want repeated demo runs to reuse the same email id. By default, the demo creates a fresh id each time.

Use `onboarding@resend.dev` only for testing. In production, set `FROM_EMAIL` to an address on your verified sending domain.

## Production Notes

- Verify your sending domain in Resend before sending to real users.
- Only send Bloom the fields needed to make the image.
- Retry later if Bloom or Resend is temporarily unavailable.
- Keep `BLOOM_TIMEOUT_MS` lower than the maximum time your app can wait for a request.
- Track image failures, email failures, and repeated email ids.
- If your product needs a backup image, add it in your own app. This example stops instead of sending a generic email.

## Troubleshooting

- `UNAUTHORIZED`: check `BLOOM_API_KEY`.
- `BRAND_NOT_FOUND`: check `BLOOM_BRAND_SESSION_ID` and make sure the key can access it.
- `INSUFFICIENT_CREDITS`: add credits in Bloom.
- `TOO_MANY_REQUESTS`: back off and retry later.
- Resend domain errors: use `onboarding@resend.dev` for sandbox or verify your production domain.
- Timeout errors: increase `BLOOM_TIMEOUT_MS` or run this from a part of your app that can wait longer.

## Verification

```bash
npm run typecheck
npm run test
npm run trigger
```
