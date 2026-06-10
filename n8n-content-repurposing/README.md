# Bloom + n8n Content Repurposing

Turn one blog post into on-brand visual content for every channel, in one run.

This n8n workflow takes a blog post, asks Claude to plan platform-specific copy, then calls Bloom to generate an on-brand image for each channel. You get the main blog image plus an adapted caption and a correctly-sized image for Instagram, LinkedIn, and Twitter/X. The text already gets repurposed everywhere; the on-brand image is the part nobody automates.

Out of the box the demo researches your brand on the web and writes its own blog post about something real and recent, so the first run is coherent for any brand with zero content to prepare. In production you swap the demo-post nodes for your real blog source (see [Pass Your Own Data](#pass-your-own-data)).

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

Double-click the **Bloom: get brand** node. Below the **Authentication** dropdowns there is a **Header Auth** field. Open its dropdown and click **+ Create new credential**. n8n opens a **Header Auth** credential form.

Before anything else, rename the credential: click its name in the **top-left corner** of the dialog (it defaults to "Header Auth account") and type `Bloom API key`. You are about to create two look-alike Header Auth credentials, and this name is the only way to tell them apart later. Then fill in the fields exactly:

| Field | Value |
| --- | --- |
| **Name** | `x-api-key` |
| **Value** | your Bloom API key |

Save it. Now do the same in **Bloom: generate** and **Bloom: wait**: open each node's **Header Auth** field and just **select "Bloom API key"** (don't make a new one).

**3. Add the Anthropic credential**

Double-click the **Write demo post (Claude)** node, open the dropdown of its **Header Auth** field (below the **Authentication** dropdowns), and **+ Create new credential** the same way. Again, rename it first in the **top-left corner** of the dialog, this time to `Anthropic API key`, then fill in:

| Field | Value |
| --- | --- |
| **Name** | `x-api-key` |
| **Value** | your Anthropic API key |

Then select "Anthropic API key" in the **Plan content (Claude)** node.

**4. Set your brand id**

Double-click the **Brand config** node and paste your brand id into the `brand_session_id` field.

> Tip: the nodes that still need a credential show a small **red triangle** ⚠️ on the canvas. When all five are gone, you're set.

## The Demo Post

The demo writes its own input: **Bloom: get brand** fetches your brand's name and website, **Write demo post (Claude)** researches the brand with web search and writes a short post about one specific, recent, real topic it found (a launch, a product, an announcement), and **Adopt demo post** reshapes it into the `title`, `body`, `url`, `author` fields a real source would emit. Every claim is grounded in what the search found, but it is still generated content: skim it before treating it as publishable.

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

Click **Test workflow**. After the demo-post nodes run:

1. **Plan content (Claude)** turns the post into a guaranteed-structured plan using [tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use): no "please reply in JSON", no text parsing.
2. **Build platform jobs** fans it out into 4 jobs, one per platform, with the aspect ratio assigned deterministically.
3. **Bloom: generate → wait → download** runs once per job and produces 4 on-brand images.
4. **Package ZIP** bundles them into `content-cards.zip`.

Download `content-cards.zip` from the last node's output: 4 labelled images, each carrying its `caption` and `headline` in the JSON so you can copy the captions straight from the run.

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
- Cost per demo run is roughly 2 Claude calls, up to 3 web searches, and 4 image generations. Once you replace the demo post with your real source, it drops to 1 Claude call + 4 image generations per blog.

## Troubleshooting

- `Set your Bloom brand id` on **Bloom: get brand**: the placeholder in **Brand config** was never replaced. Paste your brand id into `brand_session_id`.
- `BRAND_NOT_FOUND`: check the `brand_session_id` field in **Brand config** and that your key can access that brand.
- `UNAUTHORIZED`: check the Bloom credential.
- `INSUFFICIENT_CREDITS`: add credits in Bloom.
- `TOO_MANY_REQUESTS`: wait and try again.
- Claude `401` / `authentication_error`: check the Anthropic credential.
- Node shows "credentials not set" (highlighted after import): open it and select the right credential: "Bloom API key" for the Bloom nodes, "Anthropic API key" for the Claude nodes.
- `Invalid brand session ID` / `Input validation failed` on **Bloom: generate**: the `brand_session_id` value is not a valid brand id. Fix it in the **Brand config** node.

## Verification

1. Import `workflow.json`, create the two Header Auth credentials, and select them in the HTTP nodes (Bloom credential in 3 nodes, Anthropic in 2).
2. Paste your brand id into `brand_session_id` in the **Brand config** node.
3. Click **Test workflow** and confirm the full chain runs green.
4. Check the demo post in **Adopt demo post**'s output actually fits your brand, then download `content-cards.zip` from the **Package ZIP** node and check the 4 on-brand images (main 16:9, Instagram 4:5, LinkedIn 1:1, X 16:9) with a legible headline, plus the 3 captions in the run output.
