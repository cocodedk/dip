---
name: app-plan
description: Implemented scope and delivery gates
metadata:
  type: task
  updated: 2026-10-01
---

The local app implements the requested HTML, React, StyleX, localStorage and mobile offline experience using all **570 dated official questions**. The original proposed quota of 400 newly reviewed current items was removed in [[implementation-decisions]]; it was not an official requirement, and the user requested broad real-question practice.

## Implemented

1. Six Danish views: home, practice, tests, progress, question and result.
2. Daily, material, values, historical news and mistake practice; all 13 original tests plus a mixed **archival** 45-question test.
3. Official scoring: 36/45 and 4/5 values together; older 40-question exams retain 32/40. A saved deadline prevents reloading from restarting the timer.
4. Local review scheduling, private XP/ranks, active-session persistence and validated backup import/export/reset; storage failure leaves the app usable with a warning.
5. Locally bundled fonts and data with a production service worker; every view declares WebMCP tools and the build serves `/llms.txt`.

## Delivery gates

- The expected unit test count is asserted; scoring, XP, persistence, input validation and denied storage must pass.
- Chrome must actually list and execute all declared WebMCP tools; no missing tool is skipped. The proof drives tools and uses Playwright only for opening and screenshots.
- Screens fit 320, 390 and 430 px. A full 45-question test, its answer feedback and saved result work after offline reload.
- Deliberate mutations of tool annotations and import validation must fail the original tests, and source is restored afterward.
- Independent review examines the actual candidate and evidence before completion is claimed.

## Content limitations and later work

Historical news is not preparation for the next exam's current-events section. The UI labels every question by its original test date, links the official answer key and recommends the August 2026 book and recent news. Chapter mapping, independently worded current questions, longer explanations and badges remain possible later work, not delivered features. Verbatim redistribution rights must be resolved before public publishing; no deployment was requested or performed.

Links: [[question-bank]], [[question-freshness]], [[reuse-rights]], [[practice-modes]], [[offline-architecture]].
