---
name: jev-decisions
description: Jev setup trial and intended use during development
metadata:
  type: state
  updated: 2026-09-30
---

The installed Jev skills (`jev-decisions`, `jev-code-review`, `jev-verify`, `jev-route`, `jev-triage`, and `jev-browser`) were read, and one real API trial completed through OpenRouter using locally configured credentials. All **three trial cases** matched the deterministic pass rule: the threshold case passed, the values failure failed, and missing values evidence returned `unknown` with `needs_review`. The [report](data/jev-demo-report.json) records model `typesafe/jev-1.13-20260917`, provider TypeSafe, 0.495 seconds and reported cost $0.00003276; the [attempt receipt](data/jev-demo-attempt.json) records the single attempt. This is a basic setup trial, not a general accuracy benchmark.

**Use:** Load credentials locally without displaying them, submit only bounded evidence packets, and inspect every required choice, probability, margin, confidence and status. Preserve `unknown` as unresolved even at high confidence. Never put the key in chat, the vault or the app bundle.

**Aggregation:** The skill re-read on 2026-10-01 now provides `scripts/jev_orders.py`: it shuffles option orders four times in one API request, averages probabilities when available and otherwise uses majority vote, with mean confidence. `values_seen` records instability across orders; differing values must not be treated as a stable approval. This corrects the earlier snapshot, which had no averaging procedure. The original setup trial above used a single order.

**Intended use:** Jev can advise on bounded development decisions and classify supplied evidence; the offline app's exam scoring and spaced-review schedule remain deterministic local code. Its confidence is not proof that historical content is current, so source verification remains required by [[question-freshness]].

Links: [[offline-architecture]], [[question-freshness]].

**Final source-review attempt (2026-10-01):** The user explicitly approved exporting the frozen app source and test packet after automatic approval review initially blocked it. One live `jev_orders.py --orders 4 --seed 42` request returned HTTP 400 and no decisions; see the [attempt receipt](../artifacts/review-attempt.json). No automatic retry or simulated verdict was used. The independent internal read-only reviewer passed the unchanged local candidate; see [[verification]].
