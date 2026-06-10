# Bloom + n8n Content Repurposing

Turn one blog post into on-brand visual content for every channel, in one run.

This n8n workflow takes a blog post, asks Claude to plan platform-specific copy, then calls Bloom to generate an on-brand image for each channel. You get the main blog image plus an adapted caption and a correctly-sized image for Instagram, LinkedIn, and Twitter/X. The text already gets repurposed everywhere; the on-brand image is the part nobody automates.

Out of the box the demo writes its own blog post: it fetches your brand from Bloom and has Claude write a short fictional post that fits it, so the first run produces coherent output for any brand with zero content to prepare. When you wire it into production, delete the demo-post nodes and plug in your real blog source (see [Pass Your Own Data](#pass-your-own-data)).

```text
brand id -> fetch brand -> Claude writes demo post -> Claude plans copy -> Bloom images -> content-cards.zip
            \________________________________________/                     ├─ main image  16:9
             replace this part with your real source                       ├─ Instagram   4:5
                                                                            ├─ LinkedIn    1:1
                                                                            └─ Twitter/X   16:9
```

Everything runs in n8n. Bloom and Claude are called over plain HTTP, authenticated with native n8n credentials: no files to edit, no restart.

## Point Your Agent At This

Copy this template and let your coding agent wire it into your stack:

```text
Integrate trybloomai/bloom-examples/n8n-content-repurposing into my n8n instance.
Delete the demo-post nodes ("Bloom: get brand", "Write demo post (Claude)", "Adopt demo post")
and plug in my real RSS / webhook / CMS source after "Brand config".
Keep emitting title, body, url, author into "Plan content (Claude)".
Keep the tool-use call and the deterministic aspect ratios in "Build platform jobs".
```

Works with Claude Code, Codex, Cursor, Windsurf, or any coding agent with repo access.

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

Double-click the **Bloom: get brand** node. Below the **Authentication** dropdowns there is a **Header Auth** field. Open its dropdown and click **+ Create new credential**. n8n opens a **Header Auth** credential form. Fill it in exactly:

| Field | Value |
| --- | --- |
| **Name** | `x-api-key` |
| **Value** | your Bloom API key |

Save it. Now do the same in **Bloom: generate** and **Bloom: wait**: open each node's **Header Auth** field and just **select the credential you created** (don't make a new one).

**3. Add the Anthropic credential**

Double-click the **Write demo post (Claude)** node, open the dropdown of its **Header Auth** field (below the **Authentication** dropdowns), and **+ Create new credential** the same way:

| Field | Value |
| --- | --- |
| **Name** | `x-api-key` |
| **Value** | your Anthropic API key |

Then select that same credential in the **Plan content (Claude)** node.

**4. Set your brand id**

Double-click the **Brand config** node and paste your brand id into the `brand_session_id` field.

> Tip: the nodes that still need a credential show a small **red triangle** ⚠️ on the canvas. When all five are gone, you're set.

## The Demo Post

The demo writes its own input so the first run is coherent with *your* brand instead of shipping someone else's hardcoded blog text. Three nodes stand in for a real blog source:

| Node | What it does |
| --- | --- |
| **Bloom: get brand** | Fetches your brand's name and website from Bloom. Also fails fast if the brand id is missing or wrong. |
| **Write demo post (Claude)** | Writes a short fictional post that fits the brand's audience and voice. Claims stay deliberately generic. |
| **Adopt demo post** | Reshapes Claude's output into the fields a real source would emit: `title`, `body`, `url`, `author`. |

The post is fictional. It is fine for seeing your brand applied end to end, not something to publish as-is.

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

1. **Bloom: get brand** validates your brand id and returns the brand's name and website.
2. **Write demo post (Claude)** writes a short on-brand demo post as structured [tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) output.
3. **Plan content (Claude)** turns the post into a guaranteed-structured plan the same way: no "please reply in JSON", no text parsing.
4. **Build platform jobs** turns that plan into 4 jobs, one per platform, with the aspect ratio assigned deterministically.
5. **Bloom: generate → wait → download** runs once per job and produces 4 on-brand images.
6. **Package ZIP** bundles them into `content-cards.zip`.

Open the last node's output and download `content-cards.zip`. Inside are the 4 labelled images. Each item also carries its `caption` and `headline` in the JSON, so you can copy the captions straight from the run.

## Pass Your Own Data

The demo-post nodes are a placeholder for where your posts actually come from. Delete **Bloom: get brand**, **Write demo post (Claude)**, and **Adopt demo post**, then connect your real source between **Brand config** and **Plan content (Claude)**:

- **RSS Feed Trigger** to repurpose every new post automatically.
- **Webhook** to trigger from your CMS on publish.
- An **HTTP Request** to your CMS API.

Just keep emitting the same fields (`title`, `body`, `url`, `author`) into **Plan content (Claude)**, and keep the `brand_session_id` field in **Brand config** (the **Bloom: generate** node reads it from there).

To add or remove a platform, edit the `platforms` array in **Build platform jobs** and the tool schema in **Plan content (Claude)**. Aspect ratio and output file name (extension is derived from the served format) live next to each platform in that array.

## Changing Models

**Claude.** Two nodes call Claude: **Write demo post (Claude)** and **Plan content (Claude)**. Each carries its own `model` field at the top of its **JSON Body**: double-click the node, edit the field, save. They don't have to match (e.g. a cheap model for the demo post, a strong one for the content plan). The template ships `claude-fable-5` in both. Use these exact ids, with no date suffixes:

| Model id | When to pick it |
| --- | --- |
| `claude-fable-5` | The most capable Claude model; best copy quality. Template default. |
| `claude-opus-4-8` | Frontier quality at half the price of Fable 5. |
| `claude-sonnet-4-6` | Best speed/cost balance for high-volume runs. |
| `claude-haiku-4-5` | Fastest and cheapest; fine for short, simple posts. |

**Bloom.** The `model` field in the **Bloom: generate** node's JSON Body takes `fast`, `standard`, or `pro`. Use `standard` while you iterate to cut cost; the template ships `pro`.

## Optional Settings

- **`imageSize`** in the Bloom nodes: `2K` (default, 1 credit) or `4K` (2 credits). There is no cheaper-than-`2K` option, so to cut cost use a lighter Bloom `model` tier instead.

Bloom also exposes `resize` and `edit` endpoints if you want to derive more crops from one base image or tweak it later, a natural next step that is not part of this base flow.

## Before Shipping

- When the trigger is RSS/CMS, sanitize the blog body before it reaches the Claude prompt (strip instruction-like text) to avoid prompt injection.
- Add error handling / retries; Bloom and Claude can fail transiently.
- Cost per demo run is roughly 2 Claude calls + 4 image generations. Once you replace the demo post with your real source, it drops to 1 Claude call + 4 image generations per blog.

## Troubleshooting

- `Set your Bloom brand id` on **Bloom: get brand**: the placeholder in **Brand config** was never replaced. Paste your brand id into `brand_session_id`.
- `BRAND_NOT_FOUND`: check the `brand_session_id` field in **Brand config** and that your key can access that brand.
- `UNAUTHORIZED`: check the Bloom credential.
- `INSUFFICIENT_CREDITS`: add credits in Bloom.
- `TOO_MANY_REQUESTS`: wait and try again.
- Claude `401` / `authentication_error`: check the Anthropic credential.
- Node shows "credentials not set" (highlighted after import): open it and select the Header Auth credential you created.
- `Invalid brand session ID` / `Input validation failed` on **Bloom: generate**: the `brand_session_id` value is not a valid brand id. Fix it in the **Brand config** node.

## Verification

1. Import `workflow.json`, create the two Header Auth credentials, and select them in the HTTP nodes (Bloom credential in 3 nodes, Anthropic in 2).
2. Paste your brand id into `brand_session_id` in the **Brand config** node.
3. Click **Test workflow** and confirm the full chain runs green.
4. Check the demo post in **Adopt demo post**'s output actually fits your brand, then download `content-cards.zip` from the **Package ZIP** node and check the 4 on-brand images (main 16:9, Instagram 4:5, LinkedIn 1:1, X 16:9) with a legible headline, plus the 3 captions in the run output.
