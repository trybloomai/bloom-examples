# Bloom Examples

Welcome to the Bloom examples repo.

[![Bloom MCP](https://img.shields.io/badge/Bloom-MCP-111827)](https://trybloom.ai/mcp)
[![Examples](https://img.shields.io/badge/GitHub-trybloomai%2Fexamples-24292f?logo=github)](https://github.com/trybloomai/examples)
[![Templates](https://img.shields.io/badge/Templates-live-16a34a)](#templates)
[![More Coming Soon](https://img.shields.io/badge/More-coming_soon-64748b)](#templates)

![Bloom examples hero](./assets/api-hero.png)

This is where you can find ready-to-copy templates for adding Bloom to your own product.

Each template shows a practical way to connect your app to Bloom, generate a branded image, and use it in a real product flow.

## Templates

These templates are live now:

| Template | Use it for | Status |
| --- | --- | --- |
| [`resend-dynamic-email`](./resend-dynamic-email) | Adding generated brand images to dynamic emails. | Live |

More coming soon.

## How To Use A Template

Each folder works on its own. Pick the template you want, copy it into your app, add the required keys, and connect it to the place where your app should call Bloom.

You can copy a template with `degit`:

```bash
npx degit trybloomai/bloom-examples/<template-name> <your-folder-name>
```

`degit` copies only that folder from GitHub. You get the template files without the rest of the repo.

## What You Can Find Here

- Setup instructions for each template
- Required keys and setup steps
- Example app events you can replace with your own
- Prompting and integration code you can adapt to your product
- Notes for running, testing, and shipping

## Point Your Agent At This

You can also ask a coding agent to integrate a template for you:

```text
Integrate one of the templates from trybloomai/bloom-examples into my app.
Replace the mock event with my real app event.
Keep my existing email, queue, or webhook setup where possible.
```

Works with Claude Code, Codex, Cursor, Windsurf, or any coding agent with repo access.

More examples also live at [`trybloomai/examples`](https://github.com/trybloomai/examples).
