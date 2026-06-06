# Bloom + Resend Dynamic Email

Generate an on-brand hero image for any email use case, then send it through Resend.

```text
your trigger -> runEmailFlow(event) -> Bloom image -> Resend email
```

Bloom renders your `imageHeadline` inside the generated image. The email use case, body copy, and extra fields are data you pass in.

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
TEST_RECIPIENT_EMAIL=you@example.com
TEST_RECIPIENT_NAME=Maria
TEST_USE_CASE=welcome email
TEST_SUBJECT=Welcome!
TEST_IMAGE_HEADLINE=Welcome, Maria
TEST_BODY_TEXT=We are glad you are here.
```

Those `TEST_*` values are only the local demo. Change them to any email use case, or pass real values from your app when you replace the mock trigger.

Then run:

```bash
npm run trigger
```

`npm run trigger` calls external services and sends a real email. The CLI prints readable progress for validation, Bloom generation, image download, and Resend delivery. The final summary masks the recipient and never prints API keys.

The email includes a unique `X-Entity-Ref-ID` header so repeated test sends do not collapse into one Gmail thread.

## Required Accounts

- Bloom API key
- Bloom `brandSessionId` for an onboarded brand
- Resend API key
- For Resend sandbox mode, a `TEST_RECIPIENT_EMAIL` registered in Resend

## Extra Context

`EXTRA_CONTEXT` is optional and only used by the mock trigger. It is a plain string, not JSON.

```env
EXTRA_CONTEXT=Customer is on the Pro plan; signup source: webinar.
```

In a real integration, pass structured fields directly:

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

Core fields are not repeated as extra context. Additional fields are sanitized and included in the Bloom prompt, so avoid sending unnecessary PII.

## Swap In Your Stack

There are two integration points:

1. Replace `triggers/mock.ts` with your real webhook, queue worker, cron job, or product event.
2. Replace `src/emails/email-template.tsx` if you already have your own email template.

Keep `runEmailFlow(event)` as the boundary. It validates the event, builds the sanitized prompt, asks Bloom for the image, downloads it, and sends the email.

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

Pass a stable `event.id` when you have one. Resend receives it as the idempotency key. In production, also dedupe that event id in your own store before generating the image.

`event.id` is also used for the hidden `X-Entity-Ref-ID` email header, which helps Gmail keep repeated transactional sends as separate conversations. If there is no `event.id`, the example generates a fresh value.

## Point Your Agent At This

Copy this example into your project and let your coding agent wire it up:

```text
Integrate trybloomai/bloom-examples/resend-dynamic-email into my app.
Replace triggers/mock.ts with my real webhook, queue worker, or product event.
Call runEmailFlow({ useCase, recipientName, recipientEmail, subject, imageHeadline, bodyText }) from that trigger.
Keep the runEmailFlow contract stable and do not remove src/prompt.ts sanitization.
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
TEST_EVENT_ID=
EXTRA_CONTEXT=
```

`TEST_EVENT_ID` is only for testing idempotency. The mock trigger generates a fresh event id by default so repeated test runs do not collide in Resend.

Use `onboarding@resend.dev` only for testing. In production, set `FROM_EMAIL` to an address on your verified sending domain.

## Production Notes

- Verify your sending domain in Resend before sending to real users.
- Treat fields sent to Bloom as prompt data. Avoid unnecessary PII in extra event fields.
- Add your own retry/backoff around transient `429` and `5xx` failures.
- Keep `BLOOM_TIMEOUT_MS` under the maximum request duration of your runtime.
- Add monitoring around generation failures, email failures, and duplicate event ids.
- If your product needs a fallback image, provide it in your own application flow. This example fails loudly instead of sending a generic email.

## Troubleshooting

- `UNAUTHORIZED`: check `BLOOM_API_KEY`.
- `BRAND_NOT_FOUND`: check `BLOOM_BRAND_SESSION_ID` and make sure the key can access it.
- `INSUFFICIENT_CREDITS`: add credits in Bloom.
- `TOO_MANY_REQUESTS`: back off and retry later.
- Resend domain errors: use `onboarding@resend.dev` for sandbox or verify your production domain.
- Timeout errors: increase `BLOOM_TIMEOUT_MS` or move the trigger to a longer-running worker.

## Verification

```bash
npm run typecheck
npm run test
npm run trigger
```
