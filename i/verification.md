---
name: verification
description: Local delivery evidence and independent review
metadata:
  type: state
  updated: 2026-10-01
---

The local implementation passed independent read-only review with no blocking findings; the [review receipt](../artifacts/independent-review.json) is bound to the [candidate manifest](../artifacts/candidate-manifest.json). The proof is for the local production build, not a public deployment.

- [Unit receipt](../artifacts/unit.json): 22/22 tests, with the count asserted by `scripts/assert-test-count.mjs`.
- [Mutation receipt](../artifacts/mutations.json): both deliberate validation/annotation faults made the original tests fail; source was restored.
- [Real Chrome proof](../artifacts/browser/proof.json): 713 assertions, all ten tools actually listed by `getTools()` and called through `executeTool()`, correct total/values boundaries, backup/restore, a complete offline 45-question test and saved results after offline reload, no page exceptions or console errors.
- [Ordinary Chrome proof](../artifacts/browser/without-webmcp.json): eight checks passed with the API absent; the human controls render normally.
- Mobile screenshots: [320 px](../artifacts/browser/home-320.png), [390 px](../artifacts/browser/home-390.png), [430 px](../artifacts/browser/home-430.png); no horizontal overflow. Playwright only opened pages and captured screenshots; behavior used WebMCP through CDP.
- [jev-browser observation](../artifacts/jev-browser.txt): opened and read the homepage, ending at the correct local URL; no app state changed.
- TypeScript production build and oxlint/biome/lintp checks passed. The question bank and all assets are bundled locally; the roughly 118 KB compressed JavaScript chunk includes the whole bank.

Automatic approval review initially blocked exporting nonpublic source/test artifacts to OpenRouter. After the user explicitly approved the frozen packet, **one real Jev request across four option orders returned HTTP 400 without a verdict**; no automatic retry was made, and provider model/cost were not reported. The [attempt receipt](../artifacts/review-attempt.json) records this outcome. The independent internal reviewer already passed the identical unchanged candidate and supplied the completion gate. This is not a successful Jev source review or an averaging-quality result; the installed averaging procedure is documented in [[jev-decisions]].

Links: [[app-plan]], [[question-bank]], [[offline-architecture]], [[jev-decisions]].
