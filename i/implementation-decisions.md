---
name: implementation-decisions
description: Scope and design choices for the first working trainer
metadata:
  type: decision
  updated: 2026-09-30
---

The first implementation uses all 570 official historical questions, dated answer keys, a practice queue, values/material/news filters, 40/45-question tests, local rewards and offline storage; it does not claim that historical news predicts the next exam.

## Five-step pass

1. **Question:** The user's requirement is broad practice with correct answers and an offline mobile experience; the earlier 400-current-item target was a proposed plan detail, not an official exam requirement. The available 570 original items already provide a substantial source bank, with currency made visible.
2. **Delete:** Omit accounts, shared leaderboards, paid rewards, live news feeds and a backend. Keep export/import because local-only progress needs a portable backup.
3. **Simplify:** One React application, one question model, one local progress store and the original answer keys support every practice mode. Preserve dated tests and their original pass rules.
4. **Speed:** Bundle questions and fonts locally, compile StyleX at build time, and keep storage small. Use Jev for bounded content categorization and independent evidence review during development.
5. **Automate:** Add a content validator, build-generated offline cache manifest and a WebMCP browser proof only after the flows are concrete.

## Visual plan

- Palette: cool paper `#F2F5F7`, white `#FFFFFF`, marine ink `#163143`, Danish red `#CB2431`, sea green `#11786E`, muted steel `#596F7B`.
- Type: locally bundled DM Sans throughout, with large readable question text and clear numeric score typography.
- Layout: a narrow exercise workbook with left-aligned content, a red start action, a quiet section list and a four-item bottom navigation; the question takes most of the screen during practice.
- Character: the Danish flag cross provides the single strong visual motif; question choices, the values threshold and dated source labels carry the rest of the structure.

```text
flag  Prøveklar                 offline status
      Indfødsretsprøven

Din næste øvelse
10 spørgsmål, plads til at lære
[ Start dagens øvelse ]

36/45 i alt       4/5 værdier
Øv værdier        Gentag fejl
Tidligere prøver  Dine fremskridt

Hjem   Øv   Prøver   Fremskridt
```

**Design check:** A flag motif, section-specific exam rules and an exercise layout connect the interface directly to this subject; avoid generic dashboard statistics as the opening screen. See [[offline-architecture]], [[practice-modes]], [[question-freshness]].

Links: [[offline-architecture]], [[practice-modes]], [[question-freshness]].
