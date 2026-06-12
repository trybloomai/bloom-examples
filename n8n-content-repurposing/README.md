# Bloom + n8n Content Repurposing

Turn one finished blog post into an on-brand image for every channel, in one run.

You already wrote the post and the captions; the on-brand image for each platform is the missing piece. This n8n workflow takes your post and captions through a form, lets you pick one of your Bloom brands from a dropdown, and calls Bloom to generate each platform's image at the right size with your blog title drawn on-brand inside it. No LLM in the loop: each image brief is a fixed per-platform template with your own copy injected. The run ends with the outputs rendered in your browser, plus a `content-cards.zip`.

```text
form: blog post + captions -> pick your brand -> per-platform prompts -> Bloom generates -> results in your browser
                              (from the API,     (fixed templates +     ├─ main image  16:9      + content-cards.zip
                               no ids to copy)    your copy, no LLM)    ├─ Instagram   4:5
                                                                        ├─ LinkedIn    1:1
                                                                        └─ Twitter/X   16:9
```

## Point Your Agent At This

Copy this template and let your coding agent wire it into your stack:

```text
Integrate trybloomai/bloom-examples/n8n-content-repurposing into my n8n instance.
Replace the form trigger ("Form: paste your post + captions") with my real source
(RSS / webhook / CMS) that emits title, body and per-platform captions, and pin my
brand id instead of the "Form: pick your brand" page. Keep the per-platform scene
templates and the deterministic aspect ratios in "Construct image prompts".
```

## Prerequisites

- **A running n8n instance**: [n8n Cloud](https://n8n.io/cloud/) or [self-hosted](https://docs.n8n.io/hosting/). Built on n8n 2.23.x.
- **A Bloom API key** from [Bloom settings](https://www.trybloom.ai/settings), with at least one brand on the account ([create one](https://www.trybloom.ai/brands) from a website URL).

## Setup

1. **Import the workflow**: in n8n, create a new workflow and use **Import from URL…** (in the **⋯** canvas menu) with:

   ```text
   https://raw.githubusercontent.com/trybloomai/bloom-examples/main/n8n-content-repurposing/workflow.json
   ```

2. **Add the Bloom credential**: open the **Bloom: fetch your brands** node and create a new **Header Auth** credential named `Bloom API key`, with **Name** `x-api-key` and **Value** your Bloom API key. Select that same credential in **Bloom: generate images** and **Bloom: wait until ready**. That's all the configuration there is.

## How a Run Works

1. Click **Execute workflow**; the form opens. Paste your blog title, body, and the captions for Instagram, LinkedIn, and Twitter/X — they're never rewritten.
2. Pick your brand from the dropdown on the second form page (populated from the Bloom API).
3. The workflow builds four deterministic image briefs (fixed scene template per platform + your copy) and generates an image for each: blog hero `16:9`, Instagram `4:5`, LinkedIn `1:1`, Twitter/X `16:9`.
4. The final form page renders all outputs in your browser. **Zip the outputs (content-cards.zip)** also bundles a self-contained `preview.html` plus the labelled images, downloadable from that node's output on the canvas.

## Pass Your Own Data

The two form pages are a placeholder for wherever your posts actually come from:

```text
 1  Form: paste your post + captions        ┐ REPLACE with your source:
 2  Bloom: fetch your brands                │ RSS / webhook / CMS trigger
 3  Build brand dropdown                    │ + a pinned brand id
 4  Form: pick your brand                   ┘
 5  Normalize input (post + brand id)       ← ADAPT: the contract (see below)
 6  Construct image prompts (1 per platform)┐
 7  Bloom: generate images                  │
 8  Bloom: wait until ready                 │
 9  Download finished images                │ KEEP as is
10  Collect + name the 4 files              │
11  Render results preview (HTML)           │
12  Zip the outputs (content-cards.zip)     ┘
13  Form: show results in browser           ← DELETE when automating; ship the zip
                                              to Slack / Drive / your CMS instead
```

Everything from node 6 down only reads the object emitted by node 5. Swap nodes 1–4 for your trigger, then rewrite node 5's few lines to emit the same shape:

```js
{ brand_session_id, brand_name, title, body,
  captions: { instagram, linkedin, twitter } }
```

If your CMS body is HTML, strip the tags in node 5: the prompts and the preview expect plain text. To add or remove a platform, edit the `platforms` array and `SCENES` templates in **Construct image prompts (1 per platform)** and the form fields.

## Tuning The Images

- **Scene templates** (`SCENES` in **Construct image prompts**) hold the per-platform art direction; edit them in plain English. Don't add style words (colors, fonts, "minimalist"): Bloom's brand layer applies your brand's styling on its own.
- **The in-image headline** is your blog title; change the `headline` assignment in the same node for a different line.
- **Model and cost**: the `model` field in **Bloom: generate images** takes `fast`, `standard`, or `pro` (the template ships `pro`; use `standard` while iterating). `imageSize` is `2K` (default, 1 credit) or `4K` (2 credits). A run costs 4 image generations, no LLM cost.

## Troubleshooting

- `No ready brands on this Bloom account`: create a brand at [trybloom.ai/brands](https://www.trybloom.ai/brands) and wait for onboarding to finish.
- `UNAUTHORIZED` / `INSUFFICIENT_CREDITS` / `TOO_MANY_REQUESTS`: check the credential / add credits / wait and retry.
- Node highlighted after import: open it and select the `Bloom API key` credential.
- The **Continue** button spins forever on the first page: either the brand-list call failed (check **Executions** for the error) or the form tab is stale — in test mode the URL is single-use per **Execute workflow** click, so click it again and use the fresh tab.
- The form tab spins after picking the brand: that's the run itself; 4 generations take a couple of minutes.

## The Factory Page

`factory.html` is a stand-alone demo front end for pitching the idea: blog posts ride a conveyor through the stations and finished posts come off the line. It runs on baked demo data; open it in a browser and watch. It's a visualization, not a client for the workflow.
