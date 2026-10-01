---
name: verification
description: Reproducible local verification methods
metadata:
  type: reference
  updated: 2026-10-01
---

Run the commands in [README](../README.md#webmcp-and-proof) against a local production build to generate proof receipts and screenshots in `artifacts/`; these local outputs are excluded from the repository.

- `npm test` asserts exactly 22 passing tests through `scripts/assert-test-count.mjs`.
- `npm run lint` checks the source with project-local Oxlint and Biome; `npm run build` includes the TypeScript production check and bundles the question bank and assets.
- `node scripts/mutation-proof.mjs` checks that deliberate faults make the original tests fail and restores the source afterward.
- `node scripts/browser-proof.mjs` uses real Chrome `getTools()` and `executeTool()` to exercise scoring boundaries, input rejection, persistence, export/import, registered tools and a complete offline 45-question test.
- Playwright opens tabs and captures screenshots; behavioral proof acts through WebMCP. A missing tool is reported as `NOT PROVED`.
- The separate `--without-webmcp` check verifies the ordinary browser interface when the API is absent; README describes its disposable Chrome profile.

Local checks establish behavior of the tested build; deployment verification must also check the live page and published assets. A completion claim requires independent review of the candidate.

Links: [[app-plan]], [[question-bank]], [[offline-architecture]], [[jev-decisions]].
