# Bloom Examples

Copyable examples for integrating Bloom into product workflows.

## How These Examples Work

Each folder is standalone: copy one example with `degit`, fill the required environment variables, install dependencies, and run it.

```text
your trigger -> example hook -> Bloom image -> your downstream action
```

No monorepo, no shared workspace setup, no hidden root install.

## Examples

- [`resend-dynamic-email`](./resend-dynamic-email): generate an on-brand hero image for any email use case and send it through Resend.

## Point Your Agent At This

Copy an example into your project and let your coding agent wire it up:

```text
Integrate trybloomai/bloom-examples/resend-dynamic-email into my app.
Replace triggers/mock.ts with my real webhook, queue worker, or product event.
Call runEmailFlow({ useCase, recipientName, recipientEmail, subject, imageHeadline, bodyText }) from that trigger.
Keep the runEmailFlow contract stable and do not remove src/prompt.ts sanitization.
Keep my existing email-sending setup if I already have one.
```

Works with Claude Code, Cursor, or any coding agent with repo access.
