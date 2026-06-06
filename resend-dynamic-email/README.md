# Bloom + Resend Dynamic Email

Send dynamic emails with images generated from your Bloom brand.

This example calls Bloom, creates an on-brand email hero image, downloads it, and sends the email through Resend. Use it as a starting point for welcome emails, lifecycle campaigns, receipts, reports, alerts, or any email that should carry your brand visually.

```text
email event -> runEmailFlow(event) -> Bloom image -> Resend email
```

## The Function You Call

```ts
await runEmailFlow({
  emailType: "welcome email",
  recipientName: "Maria",
  recipientEmail: "maria@example.com",
  subject: "Welcome!",
  imageHeadline: "Welcome, Maria",
  bodyText: "We are glad you are here.",
});
```

Bloom renders `imageHeadline` inside the generated image. Resend sends the final email.

Edit `src/prompt.ts` to change the Bloom prompt. Edit `src/emails/email-template.tsx` to change the email layout.

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
EMAIL_TYPE=welcome email
SUBJECT=Welcome!
IMAGE_HEADLINE=Welcome, Maria
BODY_TEXT=We are glad you are here.
```

You need:

- A [Bloom API key](https://www.trybloom.ai/settings)
- A Bloom `brandSessionId`
- A [Resend API key](https://resend.com/api-keys)
- For testing, use a [Resend test address](https://resend.com/docs/dashboard/emails/send-test-emails) like `delivered@resend.dev`. For production, [verify your sending domain](https://resend.com/domains).

To get the `brandSessionId`, open your brand in [Bloom](https://www.trybloom.ai/brands) and copy the ID from the URL. In `https://www.trybloom.ai/brand/<id>`, `<id>` is the value to paste into `BLOOM_BRAND_SESSION_ID`.

For automated workflows, you can also [list your brands with the API](https://www.trybloom.ai/docs/api#get-a-brand-id) and copy any returned `id`.

## Run The Demo

To preview the full Bloom prompt without calling Bloom or Resend:

```bash
npm run prompt
```

Then send the demo email:

```bash
npm run trigger
```

`npm run trigger` calls Bloom and Resend, then sends a real email. The terminal shows each step and never prints API keys.

The email includes a hidden `X-Entity-Ref-ID` header so repeated test emails stay easier to inspect in Gmail.

## Pass Your Own Data

For quick local tests, you can add a plain text note:

```env
EXTRA_CONTEXT=Audience prefers warm editorial photography with simple product-focused layouts.
```

In your workflow, pass fields directly:

```ts
await runEmailFlow({
  id: payload.id,
  emailType: "weekly report",
  recipientName: payload.user.name,
  recipientEmail: payload.user.email,
  subject: "Your weekly report is ready",
  imageHeadline: "Your weekly report is ready",
  bodyText: "Open your report to see the latest results.",
  plan: payload.user.plan,
  reportPeriod: payload.report.period,
});
```

Extra fields are added to the Bloom prompt after simple cleanup. Only send fields that help create the image.

## Add It To Your Workflow Or System

There are two places you will usually edit:

1. Replace `triggers/mock.ts` with the place in your workflow or system that should send the email.
2. Replace `src/emails/email-template.tsx` if you already have your own email template.

Keep calling `runEmailFlow(event)`. It checks the input, writes the Bloom prompt, asks Bloom for the image, downloads it, and sends the email.

Example route handler:

```ts
import { runEmailFlow } from "./src/email-flow";

export async function POST(request: Request) {
  const payload = await request.json();

  await runEmailFlow({
    id: payload.id,
    emailType: payload.type,
    recipientName: payload.user.name,
    recipientEmail: payload.user.email,
    subject: payload.email.subject,
    imageHeadline: payload.email.imageHeadline,
    bodyText: payload.email.bodyText,
  });

  return Response.json({ ok: true });
}
```

Pass an `event.id` when your workflow already has one. Resend uses it to avoid sending the same email twice.

## Point Your Agent At This

Copy this example into your project and let your coding agent wire it up:

```text
Integrate trybloomai/bloom-examples/resend-dynamic-email into my workflow.
Replace triggers/mock.ts with my real webhook, queue, cron job, or system event.
Call runEmailFlow({ emailType, recipientName, recipientEmail, subject, imageHeadline, bodyText }) from there.
Keep using runEmailFlow and do not remove the cleanup in src/prompt.ts.
Keep my existing email setup if I already have one.
```

Works with Claude Code, Codex, Cursor, Windsurf, or any coding agent with repo access.

## Optional Settings

Keep `.env.example` to the required values. Add these only when you need them:

```env
BLOOM_API_URL=https://www.trybloom.ai/api/v1
BLOOM_ASPECT_RATIO=16:9
BLOOM_TIMEOUT_MS=120000
FROM_EMAIL=onboarding@resend.dev
EVENT_ID=
EXTRA_CONTEXT=
```

Leave `EVENT_ID` empty for normal testing. The demo will treat each run as a new email.

Set `EVENT_ID` only when you already have a real event id from your system. Reusing that id helps prevent sending the same email twice if the same event is retried.

Use `onboarding@resend.dev` only for testing. In production, set `FROM_EMAIL` to an address on your verified sending domain.

## Before Shipping

- Verify your sending domain in Resend before sending to real users.
- Only send Bloom the fields needed to make the image.
- Retry later if Bloom or Resend is temporarily unavailable.
- Keep `BLOOM_TIMEOUT_MS` lower than the maximum time your workflow can wait for a request.
- Track image failures, email failures, and repeated email ids.
- Add your own backup image if your product needs one. This example stops instead of sending a generic email.

## Troubleshooting

- `UNAUTHORIZED`: check `BLOOM_API_KEY`.
- `BRAND_NOT_FOUND`: check `BLOOM_BRAND_SESSION_ID` and make sure the key can access it.
- `INSUFFICIENT_CREDITS`: add credits in Bloom.
- `TOO_MANY_REQUESTS`: wait and try again.
- Resend domain errors: use `onboarding@resend.dev` for testing or verify your sending domain.
- Timeout errors: increase `BLOOM_TIMEOUT_MS` or run this from a part of your system that can wait longer.

## Verification

```bash
npm run typecheck
npm run test
npm run trigger
```
