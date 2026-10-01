import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const report = JSON.parse(await readFile("artifacts/unit.json", "utf8"));
assert.equal(report.numTotalTests, 22, "The expected test count changed.");
assert.equal(report.numPassedTests, 22, "Every test must pass.");
assert.equal(report.numFailedTests, 0);
console.log("22/22 unit tests passed.");
