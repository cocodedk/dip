---
name: offline-architecture
description: Proposed static mobile-first architecture and persistence
metadata:
  type: decision
  updated: 2026-09-30
---

Build a static **React + TypeScript + StyleX** app with Vite, a mobile-first single-column layout, and no account. StyleX's [official Vite + React guide](https://stylexjs.com/docs/learn/installation/vite/vite-react) uses `@stylexjs/unplugin` before the React plugin and a CSS entry file. Package the vetted question bank as versioned static content; store only progress, answer history, rank and preferences in `localStorage` under a versioned schema. Use a service worker and cache manifest to make the shell and content work offline after first installation. Sources: [MDN service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [MDN storage limits](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

Provide export/import and reset for local progress; handle storage denial/quota and private browsing without crashing. Offline content can become stale, so display its edition and last update. Serve over HTTPS or localhost for service workers. Each product page will register its own WebMCP `describe` and page-action tools, and `/llms.txt` will list them, per the project's instructions; controls remain available to people.

**How to apply:** Prove a production build on a 320–430 px viewport, reload in airplane mode after first visit, restore progress after reopening, and compare the WebMCP tool list with the page controls. See [[app-plan]], [[question-freshness]].

Links: [[app-plan]], [[question-freshness]].
