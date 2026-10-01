# dip — Prøveklar

Mobile first practice for the Danish citizenship test, in Danish, with **570 questions and official answer keys from 13 exams (summer 2020–summer 2026)**. HTML, React, TypeScript, compiled StyleX, localStorage and a service worker; no account or server is needed after installation.

## Website

[Prøveklar](https://dip.cocode.dk/) — a static, Danish practice app; [About Prøveklar](https://dip.cocode.dk/om/) includes author links, sources, privacy and rights.

## Features

Archived exams, focused practice, spaced review, local progress backups and offline use; the Danish **Om Prøveklar** page includes author links, sources, privacy and license information. The exam rules and limitations are described below.

## Build from source

Use Node.js 24 and npm:

```sh
git clone https://github.com/cocodedk/dip.git
cd dip
npm ci
./scripts/install-hooks.sh
npm run dev
```

For offline use, build and open the production preview:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Open http://127.0.0.1:4173/ online once and wait for **Klar offline**; then reload offline. A deployed static copy needs HTTPS. An ordinary file opened with `file://` does not install the service worker. The development server does not offer offline installation.

The production build pre-renders the real React Home and About views as readable HTML at `/` and `/om/`, with distinct titles, descriptions, canonical URLs and structured data. JavaScript restores local progress through the same controller. The build generates the sitemap and offline cache; `scripts/og-image.html` is the source for the 1200×630 social image, rendered with `CHROME_PATH=/usr/bin/google-chrome node scripts/render-og.mjs`. Its content hash versions the image URL so revised previews can be fetched.

## Practice

- Daily practice, values, material, historical news and mistakes; choose 10, 20 or 50 questions, bounded by the category's distinct concepts.
- All 13 original tests and a mixed **archival** 35 + 5 + 5 test, with a persistent 45-minute deadline and feedback after submission.
- Current format: **at least 36/45 overall AND at least 4/5 values**; no single designated question must be correct. Earlier 40-question tests use their original 32/40 rule.
- Correct answers, the test date and official PDF/answer-key links are shown in feedback. Historical news and mutable facts may be outdated; study the August 2026 official book and recent news for the upcoming exam.
- Spaced reviews, private XP and ranks; same-day repetition earns no extra XP, and rank requires recall on two different days.
- Progress, active answers and the deadline persist locally. Export/import a JSON backup to move devices; reset requires confirmation. If storage is denied, practice continues in memory with a visible warning.

This is a local practice tool, not an official test or a citizenship eligibility decision. Verbatim redistribution rights for official questions and answers remain unconfirmed; the Apache-2.0 license covers original application code and assets only, not official material, and no SIRI permission or endorsement is claimed (see [NOTICE](NOTICE) and [reuse rights](i/reuse-rights.md)). Research, source links, learning methods, limitations and reward decisions are in the [research vault](i/MEMORY.md).

## WebMCP and proof

Every view registers its own tools in [src/webmcp.ts](src/webmcp.ts) through **`document.modelContext.registerTool`**. The shared tool table [src/tool-info.ts](src/tool-info.ts) generates `/llms.txt` during the build. Tools use the same controller as the buttons, validate inputs themselves and return `{ok:true,state}`, export's `{ok:true,data}`, or `{ok:false,error,state}`. Correct answers stay hidden during tests.

The tools are `describe`, `navigate`, `start_practice`, `start_test`, `resume_session`, `answer_question`, `move_question`, `finish_session`, `open_result` and `manage_progress`; only those relevant to the current view are registered. Re-discover tools after navigating. `move_question.index` starts at zero. Destructive progress actions and finishing a session need `confirm:true`.

WebMCP currently requires Chrome 150+ with the WebMCP flag or an origin-trial token; this local app uses the flag and has no trial registration. Ordinary browsers still have the buttons. The API is a moving draft; recheck the [spec](https://webmachinelearning.github.io/webmcp/) before changing the integration.

```sh
npm test                  # asserts the expected 22 tests
npm run lint
node scripts/mutation-proof.mjs

# In a second terminal, disposable Chrome with WebMCP:
google-chrome --headless=new --no-sandbox --disable-dev-shm-usage \
  --enable-features=WebMCP --remote-debugging-port=9222 \
  --user-data-dir=/tmp/proeveklar-chrome about:blank

node scripts/browser-proof.mjs
# Targeted quiz layout and complete 40/45-question exam checks:
node scripts/browser-proof.mjs --quiz-layout
```

The browser proof clears this disposable profile's app data, calls **real Chrome `getTools()` and `executeTool()`**, and uses Playwright only to open tabs and capture screenshots. It proves scoring boundaries, input rejection, persistence, export/import, all tools and a complete offline 45-question test, plus About content, links, session resumption and layouts at 360, 390, 768 and 1280 pixels. Screenshots and receipts go to `artifacts/`, excluded from the production build. Missing tools fail with `NOT PROVED`. For the no-WebMCP check, start a separate disposable Chrome on port 9223 without the flag and run `BU_CDP_URL=http://127.0.0.1:9223 node scripts/browser-proof.mjs --without-webmcp`.

The source importer is `scripts/import_official_exams.py`; it uses `pdftotext` and writes the sourced bank to `i/data/official-exams.json`. Importer receipts and source PDFs are outside the published app.

## Architecture

```text
src/       React views, shared controller, StyleX and WebMCP
public/    Static assets, domain and search metadata
scripts/   Build, import, proof and repository setup
i/         Research and sourced question bank
.github/   CI, Pages deployment and contributor templates
```

| Layer | Technology |
|---|---|
| Interface | React, TypeScript, compiled StyleX |
| Build and checks | Vite, TypeScript, Vitest, Oxlint, Biome |
| Persistence | localStorage and service worker |
| Agent tools | WebMCP; build-generated `/llms.txt` |

[Contributing](CONTRIBUTING.md) describes local hooks, branch conventions and verification; report vulnerabilities via [SECURITY.md](SECURITY.md).

## Author

**Babak Bandpey** — [Cocode](https://cocode.dk) | [LinkedIn](https://linkedin.com/in/babakbandpey) | [GitHub](https://github.com/cocodedk)

## License

Apache-2.0 applies to original code and project assets; official questions, answers and study material are excluded, with redistribution rights unverified as documented in [NOTICE](NOTICE) and [reuse rights](i/reuse-rights.md).

Apache-2.0 | © 2026 [Cocode](https://cocode.dk) | Created by [Babak Bandpey](https://linkedin.com/in/babakbandpey)
