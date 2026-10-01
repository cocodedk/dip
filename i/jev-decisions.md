---
name: jev-decisions
description: Bounded evidence classification during development
metadata:
  type: reference
  updated: 2026-10-01
---

Jev can advise on bounded development decisions and classify supplied evidence; the offline app's exam scoring and spaced-review schedule remain deterministic local code.

**Evidence handling:** Submit only the evidence needed for a decision and inspect every required choice, probability, margin, confidence and status. Preserve `unknown` as unresolved even at high confidence. Never put credentials in chat, the research vault or the app bundle.

**Aggregation:** Varying option order can expose unstable judgments. When multiple orders are evaluated, average probabilities when available; otherwise compare the votes and confidence. Differing decisions across orders must not be treated as a stable approval.

**Limits:** Model confidence is not proof that historical content is current or that an implementation works. Verify official sources as described in [[question-freshness]] and use the reproducible checks in [[verification]]; independent review remains a separate completion gate.

Links: [[offline-architecture]], [[question-freshness]], [[verification]].
