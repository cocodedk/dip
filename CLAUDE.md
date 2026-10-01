# Project conventions

- React/TypeScript + StyleX, localStorage, static offline app; keep the interface in Danish.
- Research artifacts: `i/`; session memory: `memory/MEMORY.md`; no secrets in either vault.
- Historical questions must retain their original dates and answer-key links; never describe historical news as current preparation.
- Both exam thresholds must pass: 36/45 overall and 4/5 values; original 40-question exams use 32/40.
- Buttons and WebMCP share `Controller`; every view declares tools through `document.modelContext` and the build generates `/llms.txt` from `src/tool-info.ts`.
- Browser proof acts through WebMCP; Playwright only opens and screenshots. A tool missing from real Chrome `getTools()` is not proved.
- Use project `npm test`, `npm run build`, `npm run lint`; assert the test count. Independent review is required for a release claim.
- Service-worker changes must prove an upgrade from a previously cached build with another tab open, followed by a real reload and offline use; a clean browser alone does not prove updates.
