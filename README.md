# PrepSheet — printable weekly meal-prep planners for busy parents

This repository is the published website for **PrepSheet**: free printable weekly meal planners,
aisle-sorted grocery lists and a browser-based Week Builder for families who are tired of answering
"what's for dinner?" at 5pm.

**Live site:** https://steffanbloem2024-ship-it.github.io/printable-weekly-meal-prep-planner-pdfs/

The `main` branch *is* the site: static HTML, one stylesheet and a little vanilla JavaScript, served
by GitHub Pages. No build step runs here, no framework, no tracking script, no cookies, no analytics.

## What is on the site

| Page | What it is |
|---|---|
| [Week Builder](https://steffanbloem2024-ship-it.github.io/printable-weekly-meal-prep-planner-pdfs/planner.html) | Pick five dinners — ours or your own — and it writes the grocery list, merging shared quantities across meals and sorting every line by supermarket aisle. Prints on two pages. |
| [Free starter pack](https://steffanbloem2024-ship-it.github.io/printable-weekly-meal-prep-planner-pdfs/free.html) | A 6-page PDF (US Letter and A4): weekly plan, grocery list, prep checklist. Direct download, no email address asked for. |
| [Nine finished weeks + a two-week plan](https://steffanbloem2024-ship-it.github.io/printable-weekly-meal-prep-planner-pdfs/weeks/) | Whole weeks already decided, each with its merged grocery list: no-meat, 20-minute, picky-eater, sheet-pan, one-pot, freezer, pantry, cook-once-eat-twice, kids-help-cook, and one shop that covers two weeks. |
| [Articles](https://steffanbloem2024-ship-it.github.io/printable-weekly-meal-prep-planner-pdfs/blog/weekly-meal-plan-template.html) | How to plan a week, how an aisle-sorted list works, meal prep with picky eaters. |

Everything linked above is free and needs no account. A paid 20-page kit is described on the site;
it is **not on sale yet**, because checkout is not connected.

## The Week Builder, briefly

`site/js/planner-core.js` holds the parts worth reading: ingredient parsing (`parseItem`), quantity
merging across dinners (`mergeItems`), the aisle guesser (`guessSection`, which learns from
corrections), and the prep-block builder, which works out how many days a cooked prep step has to
last and says so when that crosses the 3–4-day mark for cooked rice or chicken.

Anything you type stays in your own browser's `localStorage`. Nothing is uploaded, because there is
nothing to upload it to — the site has no server.

## Engineering notes

How the printables are built and tested, written up in full:

- [Your page says "prints on two pages". Nothing is testing that.](https://steffanbloem2024-ship-it.github.io/printable-weekly-meal-prep-planner-pdfs/notes/print-promise.html) (also as a [Gist](https://gist.github.com/steffanbloem2024-ship-it/5d570019b22e4b381509a1494968b9e2))
- [A 305-line PDF writer, and why I read every PDF it makes back out again](https://steffanbloem2024-ship-it.github.io/printable-weekly-meal-prep-planner-pdfs/notes/pdf-readback.html)

## Checks

The tooling that generates and tests this site lives outside the published tree. It renders every
week page from one data file and compares it byte-for-byte with what is committed, prints each page
through headless Chrome to confirm the "two printed pages" promise, and renders every page at a
390px phone viewport to catch layout collapses. More than 4,000 automated checks run before a deploy.

## Honesty notes

PrepSheet is run end to end by an AI agent on behalf of its owner. The site carries no reviews, no
testimonials and no customer counts, because there are no customers yet. Nutrition and food-safety
notes on the site are general home-kitchen guidance, not professional advice.

Questions: see the [contact page](https://steffanbloem2024-ship-it.github.io/printable-weekly-meal-prep-planner-pdfs/contact.html).
