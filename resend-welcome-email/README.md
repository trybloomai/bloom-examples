# Bloom + Resend Welcome Email

Generate a personalized welcome hero with Bloom and send it as an inline image through Resend.

The example is built around one stable hook:

```ts
await runWelcomeFlow({
  id: "user.created_123",
  name: "Maria",
  email: "maria@example.com",
  plan: "Pro",
});
```

Flow:

```text
trigger -> runWelcomeFlow(event) -> Bloom image generation -> inline CID attachment -> Resend email
```

Bloom renders the recipient name inside the generated image. The email layout stays brand-agnostic; the brand expression lives in the Bloom output.

## Requirements

- Node 18 or newer
- A Bloom API key
- A Bloom `brandSessionId` for an onboarded brand
- A Resend API key
- For Resend sandbox mode, `TEST_EMAIL` must be an address registered in Resend

## Setup

```bash
npx degit trybloomai/bloom-examples/resend-welcome-email resend-welcome-email
cd resend-welcome-email
npm install
cp .env.example .env
npm run trigger
```

Fill `.env` before running the trigger.

```env
BLOOM_API_KEY=bloom_sk_...
BLOOM_BRAND_SESSION_ID=...
RESEND_API_KEY=re_...
TEST_EMAIL=you@example.com
```

Optional values:

```env
BLOOM_API_URL=https://www.trybloom.ai/api/v1
BLOOM_ASPECT_RATIO=16:9
BLOOM_TIMEOUT_MS=120000
FROM_EMAIL=onboarding@resend.dev
EMAIL_SUBJECT=Welcome!
TEST_NAME=Maria
TEST_EVENT_ID=
EXTRA_CONTEXT=
```

### Extra Context

`EXTRA_CONTEXT` is a simple string used only by the mock trigger. It becomes one extra event field named `signupContext`, and `buildPrompt(event)` injects it into the Bloom prompt after sanitizing it.

Use it for small bits of signup context that should influence the hero image:

```env
EXTRA_CONTEXT=Signed up after reading the pricing page.
```

or:

```env
EXTRA_CONTEXT=Plan: Pro; signup source: webinar; use case: launching weekly campaigns.
```

You do not need JSON in `.env`. For structured data in a real integration, pass fields directly to `runWelcomeFlow`:

```ts
await runWelcomeFlow({
  id: payload.id,
  name: payload.user.name,
  email: payload.user.email,
  plan: payload.user.plan,
  signupSource: payload.source,
});
```

`email` and `id` are never injected into the prompt. Extra fields are included, so avoid sending unnecessary PII.

### Mock Event Id

The mock trigger generates a fresh `event.id` by default so you can run `npm run trigger` repeatedly while testing.

Set `TEST_EVENT_ID` only when you want to test idempotency behavior:

```env
TEST_EVENT_ID=user.created_123
```

Resend idempotency keys are strict. Reusing the same `TEST_EVENT_ID` with a different email body within 24 hours can be rejected by Resend.

## API Keys

Get your Resend API key from the Resend dashboard. In sandbox mode, send only to a verified test address. In production, replace `FROM_EMAIL` with an address on a verified domain.

Get your Bloom API key and `brandSessionId` from Bloom. The brand must already be onboarded and ready to generate.

## Replace The Trigger

`triggers/mock.ts` is intentionally small. Replace it with your webhook, queue worker, or product event handler and keep calling `runWelcomeFlow(event)`.

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

`npm run trigger` calls external services and sends a real email. While it runs, the CLI prints progress for validation, Bloom generation, waiting, image download, and Resend delivery. The final summary masks the recipient and never prints API keys.
