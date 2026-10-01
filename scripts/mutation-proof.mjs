import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
await mkdir("artifacts", { recursive: true });
const variants = [
	{
		path: "src/webmcp.ts",
		name: "acting-tools-read-only",
		from: "readOnlyHint: readOnly,",
		to: "readOnlyHint: true,",
		test: "only describe is read-only",
	},
	{
		path: "src/storage.ts",
		name: "remove-import-closed-shape",
		from: '!closed(data, ["version", "xp", "items", "results", "active"]) ||',
		to: "",
		test: "import rejects undeclared fields",
	},
];
const receipts = [];
for (const variant of variants) {
	const original = await readFile(variant.path, "utf8");
	assert.ok(
		original.includes(variant.from),
		`${variant.name}: mutation location exists`,
	);
	try {
		await writeFile(variant.path, original.replace(variant.from, variant.to));
		const result = spawnSync(
			"node_modules/.bin/vitest",
			[
				"run",
				"src/app.test.ts",
				"-t",
				variant.test,
				"--reporter=json",
				`--outputFile=artifacts/mutation-${variant.name}.json`,
			],
			{ encoding: "utf8", timeout: 30_000 },
		);
		assert.equal(result.status, 1, `${variant.name}: mutated code must fail`);
		const report = JSON.parse(
			await readFile(`artifacts/mutation-${variant.name}.json`, "utf8"),
		);
		assert.equal(report.numFailedTests, 1);
		assert.equal(report.numPassedTests, 0);
		receipts.push({
			name: variant.name,
			test: variant.test,
			failed: report.numFailedTests,
			restored: true,
		});
	} finally {
		await writeFile(variant.path, original);
	}
}
await writeFile(
	"artifacts/mutations.json",
	`${JSON.stringify(receipts, null, 2)}\n`,
);
console.log("2/2 deliberate mutations caught; original source restored.");
