# Bloom + n8n Content Repurposing

Turn one blog post into on-brand visual content for every channel, in one run.

This n8n workflow takes a blog post, asks Claude to plan platform-specific copy, then calls Bloom to generate an on-brand image for each channel. You get the main blog image plus an adapted caption and a correctly-sized image for Instagram, LinkedIn, and Twitter/X. The text already gets repurposed everywhere; the on-brand image is the part nobody automates.

```text
blog post -> Claude plans copy -> Bloom images -> content-cards.zip
                                   ├─ main image  16:9
                                   ├─ Instagram   4:5
                                   ├─ LinkedIn    1:1
                                   └─ Twitter/X   16:9
```

Everything runs in n8n. Bloom and Claude are called over plain HTTP, authenticated with native n8n credentials: no files to edit, no restart.

## Prerequisites

- **A running n8n instance**: [n8n Cloud](https://n8n.io/cloud/) (hosted, nothing to install) or [self-hosted](https://docs.n8n.io/hosting/). Built and tested on n8n 2.23.x.
- **A Bloom API key and a brand id**: get the key from [Bloom settings](https://www.trybloom.ai/settings). For the brand id, open your brand in [Bloom](https://www.trybloom.ai/brands) and copy the `<id>` from the URL `https://www.trybloom.ai/brand/<id>`. (For automation you can also [list brands via the API](https://www.trybloom.ai/docs/api#get-a-brand-id) and copy any returned `id`.)
- **An Anthropic API key**: from the [Anthropic Console](https://console.anthropic.com/settings/keys).

## Setup

Everything is done in the n8n UI: no `docker-compose`, no environment variables.

**1. Import the workflow**

The repo is public, so the easiest path is **Import from URL**. In n8n, create a new workflow, open the **⋯** menu in the **top-right corner** of the canvas, choose **Import from URL…**, and paste:

```text
https://raw.githubusercontent.com/trybloomai/bloom-examples/main/n8n-content-repurposing/workflow.json
```

> Both import options live inside that **⋯** menu; they are not buttons on the main screen. Prefer the files on disk? Run `npx degit trybloomai/bloom-examples/n8n-content-repurposing` first, then use **Import from File…** instead.

**2. Add the Bloom credential**

Double-click the **Bloom: generate** node. At the top of the node there is a **Credential to connect with** field. Open its dropdown and click **+ Create new credential**. n8n opens a **Header Auth** credential form. Fill it in exactly:

| Field | Value |
| --- | --- |
| **Name** | `x-api-key` |
| **Value** | your Bloom API key |

Save it. Now double-click the **Bloom: wait** node and, in the same **Credential to connect with** field, just **select the credential you created** (don't make a new one).

**3. Add the Anthropic credential**

Double-click the **Plan content (Claude)** node, open its **Credential to connect with** dropdown, and **+ Create new credential** the same way:

| Field | Value |
| --- | --- |
| **Name** | `x-api-key` |
| **Value** | your Anthropic API key |

**4. Set your brand id**

Double-click the **Mock blog post** node and paste your brand id into the `brand_session_id` field.

> Tip: the nodes that still need a credential show a small **red triangle** ⚠️ on the canvas. When all three are gone, you're set.

## The Blog Post (demo values)

The **Mock blog post** Set node holds the demo input. Edit it, or replace the node with your own source (see [Pass Your Own Data](#pass-your-own-data)).

| Field | What it is |
| --- | --- |
| `title` | The blog post title. Used as context for copy and images. |
| `body` | The blog body text. Claude reads this to write each platform's caption. |
| `url` | The post URL. Passed as context. |
| `author` | The author name. Passed as context. |
| `brand_session_id` | Your Bloom brand id (set once during Setup). Not blog content, but it lives in this node. |

## What Each Platform Gets

Claude writes a headline, a caption, and an image plan per platform. Bloom renders the image at the right aspect ratio, with the headline drawn on-brand inside it.

| Platform | Aspect ratio | Caption tone | File in zip |
| --- | --- | --- | --- |
| Main blog image | `16:9` | (no caption) | `blog-main.png` |
| Instagram | `4:5` | Conversational, a few hashtags | `instagram.png` |
| LinkedIn | `1:1` | Professional, insight-driven | `linkedin.png` |
| Twitter/X | `16:9` | Concise, under 280 chars | `twitter.png` |

File extensions follow the image format Bloom actually serves (typically PNG), so the names may end in `.jpg` or `.webp` instead.

## Run The Demo

Click **Test workflow**. The chain runs:

1. **Plan content (Claude)** returns a guaranteed-structured plan using [tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use): no "please reply in JSON", no text parsing.
2. **Build platform jobs** turns that plan into 4 jobs, one per platform, with the aspect ratio assigned deterministically.
3. **Bloom: generate → wait → download** runs once per job and produces 4 on-brand images.
4. **Package ZIP** bundles them into `content-cards.zip`.

Open the last node's output and download `content-cards.zip`. Inside are the 4 labelled images. Each item also carries its `caption` and `headline` in the JSON, so you can copy the captions straight from the run.

## Pass Your Own Data

Replace the **Mock blog post** node with where your posts actually come from:

- **RSS Feed Trigger** to repurpose every new post automatically.
- **Webhook** to trigger from your CMS on publish.
- An **HTTP Request** to your CMS API.

Just keep emitting the same fields (`title`, `body`, `url`, `author`) into **Plan content (Claude)**.

To add or remove a platform, edit the `platforms` array in **Build platform jobs** and the tool schema in **Plan content (Claude)**. Aspect ratio and output file name (extension is derived from the served format) live next to each platform in that array.

## Point Your Agent At This

Copy this template and let your coding agent wire it into your stack:

```text
Integrate trybloomai/bloom-examples/n8n-content-repurposing into my n8n instance.
Replace the "Mock blog post" Set node with my real RSS / webhook / CMS source.
Keep emitting title, body, url, author into "Plan content (Claude)".
Keep the tool-use call and the deterministic aspect ratios in "Build platform jobs".
```

Works with Claude Code, Codex, Cursor, Windsurf, or any coding agent with repo access.

## Optional Settings

- **`model`** in the Bloom nodes: `fast`, `standard`, or `pro`. Use `standard` while you iterate to cut cost; the template ships `pro`.
- **`imageSize`** in the Bloom nodes: `2K` (default, 1 credit) or `4K` (2 credits). There is no cheaper-than-`2K` option, so to cut cost use a lighter `model` tier instead.
- **Claude model**: edit the `model` field in the **Plan content (Claude)** node; defaults to `claude-sonnet-4-6`.

Bloom also exposes `resize` and `edit` endpoints if you want to derive more crops from one base image or tweak it later, a natural next step that is not part of this base flow.

## Before Shipping

- When the trigger is RSS/CMS, sanitize the blog body before it reaches the Claude prompt (strip instruction-like text) to avoid prompt injection.
- Add error handling / retries; Bloom and Claude can fail transiently.
- Cost per blog is roughly 1 Claude call + 4 image generations.

## Troubleshooting

- `UNAUTHORIZED`: check the Bloom credential.
- `BRAND_NOT_FOUND`: check the `brand_session_id` field and that your key can access that brand.
- `INSUFFICIENT_CREDITS`: add credits in Bloom.
- `TOO_MANY_REQUESTS`: wait and try again.
- Claude `401` / `authentication_error`: check the Anthropic credential.
- Node shows "credentials not set" (highlighted after import): open it and select the Header Auth credential you created.
- `Invalid brand session ID`: paste a valid brand id into `brand_session_id` in the **Mock blog post** node.

## Verification

1. Import `workflow.json`, create the two Header Auth credentials, and select them in the HTTP nodes.
2. Paste your brand id into `brand_session_id` in the **Mock blog post** node.
3. Click **Test workflow** and confirm the full chain runs green.
4. Download `content-cards.zip` from the **Package ZIP** node and check the 4 on-brand images (main 16:9, Instagram 4:5, LinkedIn 1:1, X 16:9) with a legible headline, plus the 3 captions in the run output.
