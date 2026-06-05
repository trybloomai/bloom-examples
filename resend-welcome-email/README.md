# Bloom + Resend Welcome Email

Generate a personalized welcome hero with Bloom and send it as an inline image through Resend.

```text
signup trigger -> runWelcomeFlow(event) -> Bloom image -> Resend email
```

Bloom renders the recipient name inside the generated image. The email layout stays brand-agnostic; the brand expression lives in the Bloom output.

## The Only Function You Call

```ts
await runWelcomeFlow({
  name: "Maria",
  email: "maria@example.com",
  plan: "Pro",
});
```

Add any extra event fields you want Bloom to consider. `email` and `id` are never injected into the prompt; extra fields are sanitized before they reach Bloom.

## Setup

```bash
npx degit trybloomai/bloom-examples/resend-welcome-email resend-welcome-email
cd resend-welcome-email
npm install
cp .env.example .env
```

Fill `.env`:

```env
BLOOM_API_KEY=bloom_sk_...
BLOOM_BRAND_SESSION_ID=...
RESEND_API_KEY=re_...
TEST_EMAIL=you@example.com
TEST_NAME=Maria
```

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
- For Resend sandbox mode, a `TEST_EMAIL` registered in Resend
- A `TEST_NAME` to render into the generated image

## Extra Context

`EXTRA_CONTEXT` is optional and only used by the mock trigger. It is a plain string, not JSON.

```env
EXTRA_CONTEXT=Signed up after reading the pricing page.
```

or:

```env
EXTRA_CONTEXT=Plan: Pro; signup source: webinar; use case: launching weekly campaigns.
```

In a real integration, pass structured fields directly:

```ts
await runWelcomeFlow({
  id: payload.id,
  name: payload.user.name,
  email: payload.user.email,
  plan: payload.user.plan,
  signupSource: payload.source,
});
```

## Swap In Your Stack

There are two integration points:

1. Replace `triggers/mock.ts` with your real webhook, queue worker, cron job, or signup event.
2. Replace `src/emails/welcome-email.tsx` if you already have your own email template.

Keep `runWelcomeFlow(event)` as the boundary. It validates the event, builds the sanitized prompt, asks Bloom for the image, downloads it, and sends the email.

Example route handler:

```ts
import { runWelcomeFlow } from "./src/welcome-flow";

export async function POST(request: Request) {
  const payload = await request.json();

  await runWelcomeFlow({
    id: payload.id,
    name: payload.user.name,
    email: payload.user.email,
    plan: payload.user.plan,
  });

  return Response.json({ ok: true });
}
```

Pass a stable `event.id` when you have one. Resend receives it as the idempotency key. In production, also dedupe that event id in your own store before generating the image.

`event.id` is also used for the hidden `X-Entity-Ref-ID` email header, which helps Gmail keep repeated transactional sends as separate conversations. If there is no `event.id`, the example generates a fresh value.

## Point Your Agent At This

Copy this example into your project and let your coding agent wire it up:

```text
Integrate trybloomai/bloom-examples/resend-welcome-email into my app.
Replace triggers/mock.ts with my real webhook, queue worker, or signup event.
Call runWelcomeFlow({ name, email, plan }) from that trigger.
Keep the runWelcomeFlow contract stable and do not touch src/prompt.ts sanitization.
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
EMAIL_SUBJECT=Welcome!
TEST_EVENT_ID=
EXTRA_CONTEXT=
```

`TEST_EVENT_ID` is only for testing idempotency. The mock trigger generates a fresh event id by default so repeated test runs do not collide in Resend.

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
