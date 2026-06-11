# Bloom + n8n Content Repurposing

Turn one finished blog post into an on-brand image for every channel, in one run.

You already have the blog post, and you already wrote the captions: the copy is not the problem. The on-brand image for each platform is. This n8n workflow takes your blog post and captions through a form, lets you pick one of your Bloom brands from a dropdown, and calls Bloom to generate each platform's image at the right size with your blog title drawn on-brand inside it. No LLM in the loop: the image brief for each platform is a fixed template (audience and composition per channel) with your own copy injected. The run ends with all the outputs rendered in your browser, plus a `content-cards.zip` with the files.

```text
form: blog post + captions -> pick your brand -> per-platform prompts -> Bloom generates -> results in your browser
                              (from the API,     (fixed templates +     ├─ main image  16:9      + content-cards.zip
                               no ids to copy)    your copy, no LLM)    ├─ Instagram   4:5
                                                                        ├─ LinkedIn    1:1
                                                                        └─ Twitter/X   16:9
```

Everything happens inside n8n: the input is an n8n form, the brand is picked from a dropdown populated by the Bloom API, and the result is shown by the form's final page. There is no separate web UI to visit and no ids to copy around. Bloom is called over plain HTTP, authenticated with one native n8n credential.

## Point Your Agent At This

Copy this template and let your coding agent wire it into your stack:

```text
Integrate trybloomai/bloom-examples/n8n-content-repurposing into my n8n instance.
Replace the form trigger ("Form: paste your post + captions") with my real source
(RSS / webhook / CMS) that emits title, body and per-platform captions, and pin my
brand id instead of the "Form: pick your brand" page. Keep the per-platform scene
templates and the deterministic aspect ratios in "Construct image prompts".
```

Works with Claude Code, Codex, Cursor, Windsurf, or any coding agent with repo access.

## Prerequisites

- **A running n8n instance**: [n8n Cloud](https://n8n.io/cloud/) (hosted, nothing to install) or [self-hosted](https://docs.n8n.io/hosting/). Built and tested on n8n 2.23.x.
- **A Bloom API key**: from [Bloom settings](https://www.trybloom.ai/settings). You also need at least one brand on your account ([create one](https://www.trybloom.ai/brands) from a website URL); the workflow lists your brands and lets you pick one, so you never have to copy a brand id.

## Setup

Everything is done in the n8n UI: no `docker-compose`, no environment variables.

**1. Import the workflow**

The repo is public, so the easiest path is **Import from URL**. In n8n, create a new workflow, open the **⋯** menu in the **top-right corner** of the canvas, choose **Import from URL…**, and paste:

```text
https://raw.githubusercontent.com/trybloomai/bloom-examples/main/n8n-content-repurposing/workflow.json
```

> Both import options live inside that **⋯** menu; they are not buttons on the main screen. Prefer the files on disk? Run `npx degit trybloomai/bloom-examples/n8n-content-repurposing` first, then use **Import from File…** instead.

**2. Add the Bloom credential**

Double-click the **Bloom: fetch your brands** node. Below the **Authentication** dropdowns there is a **Header Auth** field. Open its dropdown and click **+ Create new credential**. n8n opens a **Header Auth** credential form.

Rename the credential first: click its name in the **top-left corner** of the dialog (it defaults to "Header Auth account") and type `Bloom API key`, so it's recognizable later. Then fill in the fields exactly:

| Field | Value |
| --- | --- |
| **Name** | `x-api-key` |
| **Value** | your Bloom API key |

Save it. Now do the same in **Bloom: search reference images**, **Bloom: generate images**, and **Bloom: wait until ready**: open each node's **Header Auth** field and just **select "Bloom API key"** (don't make a new one).

> Tip: the nodes that still need a credential show a small **red triangle** ⚠️ on the canvas. When all four are gone, you're set. There is nothing else to configure: no other API keys, no brand id to paste, no placeholder fields.

## How a Run Works

1. **Form: paste your post + captions**: click **Execute workflow** and n8n opens the form. Paste your blog title, blog body, and the captions you already wrote for Instagram, LinkedIn, and Twitter/X. The workflow never rewrites them.
2. **Form: pick your brand**: the workflow calls the Bloom API for your brand list and shows a second form page with a dropdown. Pick the brand; its id is extracted from the selection, so nothing is copied by hand.
3. **Construct image prompts (1 per platform)** assembles four image briefs deterministically: a fixed scene template per platform (what reads well for that audience, at that size) plus your caption as subject matter and your blog title as the in-image headline. No LLM call, nothing generated: every word that ends up in or next to an image is yours.
4. **Bloom: generate images → wait until ready → download** runs once per platform and produces 4 on-brand images. Up to 4 reference images ride along, picked by semantic search over your brand's library using the blog title as the query.
5. **Your results, in the browser**: the final form page renders every output: the blog post with its new hero image, and the Instagram/LinkedIn/X posts with your captions and the generated images in place. **Zip the outputs (content-cards.zip)** also bundles `preview.html` (the same page, self-contained) plus the 4 labelled images into `content-cards.zip`, downloadable from that node's output in the canvas.

## What Each Platform Gets

Each platform has its own brief template tuned to its audience; your captions are passed through untouched, and the blog title is the headline Bloom draws inside every image. Bloom renders at the right aspect ratio per channel.

| Platform | Aspect ratio | Caption | File in zip |
| --- | --- | --- | --- |
| Main blog image | `16:9` | (none: the blog body is the copy) | `blog-main.png` |
| Instagram | `4:5` | yours, from the form | `instagram.png` |
| LinkedIn | `1:1` | yours, from the form | `linkedin.png` |
| Twitter/X | `16:9` | yours, from the form | `twitter.png` |

File extensions follow the image format Bloom actually serves (typically PNG), so the names may end in `.jpg` or `.webp` instead.

## Seeing Results Inside n8n

- All the outputs (images + your copy in platform mockups) are rendered by the **Form: show results in browser** form page at the end of every run: that is the browser tab the form opened in.
- On the canvas, each image is also visible directly: open **Download finished images** (or **Collect + name the 4 files**) and switch the output panel to **Binary**: n8n previews the images inline.
- The structured data (headlines, captions, hosted image URLs) is in the `files` array of **Collect + name the 4 files**' JSON output.

## Pass Your Own Data

The two form pages are a placeholder for wherever your posts actually come from. The node index, with what to touch when you automate:

```text
 1  Form: paste your post + captions        ┐ REPLACE with your source:
 2  Bloom: fetch your brands                │ RSS / webhook / CMS trigger
 3  Build brand dropdown                    │ + a pinned brand id
 4  Form: pick your brand                   ┘
 5  Normalize input (post + brand id)       ← ADAPT: the contract (see below)
 6  Bloom: search reference images          ┐
 7  Construct image prompts (1 per platform)│
 8  Bloom: generate images                  │
 9  Bloom: wait until ready                 │ KEEP as is
10  Download finished images                │
11  Collect + name the 4 files              │
12  Render results preview (HTML)           │
13  Zip the outputs (content-cards.zip)     ┘
14  Form: show results in browser           ← DELETE when automating (needs the
                                              form trigger); ship the zip instead
```

Everything from node 6 down only reads the object emitted by node 5, never the forms. So automating is: swap nodes 1–4 for your trigger, then rewrite node 5's few lines to map your source's fields into the same shape it emits today:

```js
{ brand_session_id, brand_name, title, body,
  captions: { instagram, linkedin, twitter } }
```

Emit that, and nodes 6–13 run unchanged. Notes:

- Your source must bring the captions (RSS doesn't have them; CMS custom fields do). Empty captions still generate images, the posts just ship without copy.
- If your CMS body is HTML (WordPress's `content.rendered`), strip the tags in node 5: the prompts and the preview expect plain text.
- Replace **Form: show results in browser** with wherever the zip goes next: Slack, Drive, your CMS.

Keep **Bloom: search reference images**: it semantic-searches your brand's library (uploaded + scraped images) with the blog title as the query and passes the closest matches as generation references, which measurably improves the output. No relevant match, or the node deleted entirely: generation still works, just without references.

To add or remove a platform, edit the `platforms` array and the `SCENES` templates in **Construct image prompts (1 per platform)**, and the form fields in **Form: paste your post + captions**. Aspect ratio, output file name, and the scene brief live next to each platform in that node.

## Tuning The Images

- **The scene templates** in **Construct image prompts (1 per platform)** (`SCENES`) are where the per-platform art direction lives: what kind of composition reads on each channel. Edit them in plain English. One rule worth keeping: don't add style words (colors, fonts, "minimalist", "premium"): Bloom's brand layer applies your brand's styling on its own, and style words in the prompt duplicate or fight it.
- **The in-image headline** is your blog title. If you want a different line inside a given image, change the `headline` assignment in **Construct image prompts (1 per platform)**.
- **Want smarter briefs?** If you'd rather have an LLM tailor each scene to the specific post, insert one Claude tool-use call between **Bloom: search reference images** and **Construct image prompts (1 per platform)**: the git history of this template has a working version of exactly that node.

## Changing Models

The `model` field in the **Bloom: generate images** node's JSON Body takes `fast`, `standard`, or `pro`. Use `standard` while you iterate to cut cost; the template ships `pro`.

## Optional Settings

- **`imageSize`** in the Bloom nodes: `2K` (default, 1 credit) or `4K` (2 credits). There is no cheaper-than-`2K` option, so to cut cost use a lighter Bloom `model` tier instead.

Bloom also exposes `resize` and `edit` endpoints if you want to derive more crops from one base image or tweak it later, a natural next step that is not part of this base flow.

## Before Shipping

- Add error handling / retries; Bloom can fail transiently (the HTTP nodes already retry a few times).
- Cost per run is 4 image generations. No LLM cost.

## Troubleshooting

- `No ready brands on this Bloom account` on **Build brand dropdown**: your key has no completed brands. Create one at [trybloom.ai/brands](https://www.trybloom.ai/brands) and wait for onboarding to finish.
- `UNAUTHORIZED`: check the Bloom credential.
- `INSUFFICIENT_CREDITS`: add credits in Bloom.
- `TOO_MANY_REQUESTS`: wait and try again.
- Node shows "credentials not set" (highlighted after import): open it and select the "Bloom API key" credential.
- The **Continue** button spins forever on the first page: two known causes. (a) The brand-list call to Bloom is what runs between the two pages; the node now times out after 15s and retries 3 times, so a real outage surfaces as a failed execution instead of an endless spinner: check **Executions** in n8n to see the error. (b) In test mode the form URL is single-use per **Execute workflow** click: submitting a stale tab from an earlier run spins forever. Click **Execute workflow** again and use the fresh tab.
- `Form Trigger node must be set before this node`: the form pages only work in a workflow that starts with the **Form: paste your post + captions** trigger; don't swap it for a manual trigger while keeping the form pages.
- The form tab shows a spinner for a while after picking the brand: that's the run itself (4 image generations take a couple of minutes). The page updates when the outputs are ready.

## The Factory Page

`factory.html` is a stand-alone demo front end for pitching the idea: an assembly line where blog posts ride a conveyor through the stations and finished posts come off the line. It runs on baked demo data (real Bloom generations for the example brand); open the file in a browser and watch. It is a visualization, not a client for the workflow; a refresh of this page to mirror the reworked workflow ships separately.

## Verification

1. Import `workflow.json`, create the Header Auth credential, and select it in the 4 Bloom HTTP nodes.
2. Click **Execute workflow**, open the form, and paste a real blog post with three captions.
3. Pick a brand on the second form page and wait for the run to finish.
4. The browser tab should render the outputs: blog post plus the Instagram (4:5), LinkedIn (1:1), and X (16:9) mockups with the 4 on-brand images, legible headlines, and your captions exactly as you wrote them. Then download `content-cards.zip` from the **Zip the outputs (content-cards.zip)** node, extract it, and open `preview.html`: same page, self-contained.
