---
name: question-bank
description: Inventory and status of the extracted official past tests
metadata:
  type: state
  updated: 2026-09-30
---

The [official archive](https://danskogproever.dk/borger/indfoedsretsproeve-statsborgerskab/forberedelse-til-indfoedsretsproeven/) currently exposes **13 complete tests and answer keys from summer 2020 through summer 2026**. The [extracted bank](data/official-exams.json) contains **570 question/answer pairs**: 40 each in summer 2020, winter 2020 and summer 2021; 45 each from winter 2021 through summer 2026. By original section, the bank has 455 study-material, 65 recent-events and 50 values items. There are 516 distinct full question/option/answer sets and 466 distinct normalized question stems; duplicate stems can have different options or historically different answers, so they must not be merged blindly.

Each JSON record has a stable test-and-number ID, term, original section, question, A/B(/C) choices, official answer letter, and direct source URLs for the test and answer key. The importer is [scripts/import_official_exams.py](../scripts/import_official_exams.py); it checks contiguous answer numbers, the expected question count, options and matching answer letters. Five visible PDF line-wrap artifacts were corrected in the importer. This is an **archival transcription**, not a vetted current practice pool.

**Apply:** Preserve all 13 original tests as historical simulations; select material for current practice only after the [[question-freshness]] review. A 400+ current bank requires distinct, checked items, not 400 rows counted from repeated or stale past questions. See [[app-plan]].

Links: [[question-freshness]], [[app-plan]].
