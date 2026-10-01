import { describe, expect, test, vi } from "vitest";
import { byId, questions, terms } from "./data";
import { recordAnswer, score, stats, mockIds } from "./learning";
import { emptyProgress, type Choice, type Session } from "./model";
import { parseProgress, storageKey } from "./storage";
import { Controller } from "./controller";
import { toolsFor, registerPage } from "./webmcp";

function memory() {
	const data = new Map<string, string>();
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
	};
}
function scenario(total: number, values: number, term = "2026-06") {
	const qs = questions.filter((q) => q.term === term);
	let materialLeft = total - values;
	let valuesLeft = values;
	const answers: Record<string, Choice> = {};
	for (const q of qs) {
		if (q.category === "values" ? valuesLeft-- > 0 : materialLeft-- > 0)
			answers[q.id] = q.answer;
		else
			answers[q.id] = Object.keys(q.options).find(
				(key) => key !== q.answer,
			) as Choice;
	}
	return {
		id: "test",
		mode: "exam",
		term,
		ids: qs.map((q) => q.id),
		index: 0,
		answers,
		revealed: false,
		startedAt: 0,
		deadline: 2_700_000,
		xpEarned: 0,
	} as Session;
}
describe("official rules and source coverage", () => {
	test("570 complete sourced rows and all thirteen original exams", () => {
		expect(questions).toHaveLength(570);
		expect(terms).toHaveLength(13);
		expect(byId.size).toBe(570);
		for (const q of questions) {
			expect(q.question.length).toBeGreaterThan(10);
			expect(q.options[q.answer]).toBeTruthy();
			expect(q.source).toMatch(/^https:\/\/danskogproever.dk\/media\//);
			expect(q.answerSource).toMatch(/^https:\/\/danskogproever.dk\/media\//);
		}
	});
	test.each([
		[35, 5, false],
		[36, 3, false],
		[40, 3, false],
		[36, 4, true],
		[45, 5, true],
	])("total %i and values %i gives %s", (total, values, passed) => {
		const result = score(scenario(total, values), 100);
		expect(result.correct).toBe(total);
		expect(result.valuesCorrect).toBe(values);
		expect(result.passed).toBe(passed);
	});
	test("historical forty-question exams use 32/40 without a values threshold", () => {
		expect(score(scenario(32, 0, "2020-06"), 100)).toMatchObject({
			total: 40,
			required: 32,
			passed: true,
			valuesCount: 0,
		});
		expect(score(scenario(31, 0, "2020-06"), 100).passed).toBe(false);
	});
	test("mixed test has the official section counts and no duplicate concepts", () => {
		const pool = mockIds().map((id) => byId.get(id)!);
		expect(pool).toHaveLength(45);
		expect(new Set(pool.map((q) => q.concept)).size).toBe(45);
		expect(
			["material", "current", "values"].map(
				(cat) => pool.filter((q) => q.category === cat).length,
			),
		).toEqual([35, 5, 5]);
	});
});
describe("learning and persistence", () => {
	test("same-day correct repetitions cannot farm XP or rank, later-day recall counts", () => {
		const p = emptyProgress();
		const q = questions[0];
		const now = Date.UTC(2026, 9, 1, 10);
		expect(recordAnswer(p, q, true, now)).toBe(10);
		expect(recordAnswer(p, q, true, now + 1000)).toBe(0);
		expect(stats(p, now).mastered).toBe(0);
		expect(recordAnswer(p, q, true, now + 86_400_000)).toBe(4);
		expect(stats(p, now + 86_400_000).mastered).toBe(1);
		recordAnswer(p, q, false, now + 2 * 86_400_000);
		expect(p.items[q.concept]).toMatchObject({
			stage: 0,
			lastCorrect: false,
			dueAt: now + 3 * 86_400_000,
		});
	});
	test("practice commits once and resumes persisted feedback after reload", () => {
		const store = memory();
		const c = new Controller(store);
		c.startPractice("values", 10);
		const q = c.getSnapshot().session!.question;
		const answer = byId.get(q.id)!.answer;
		expect(c.move(1).ok).toBe(false);
		expect(c.answer("wrong-id", answer).ok).toBe(false);
		expect(c.answer(q.id, answer).ok).toBe(true);
		expect(c.answer(q.id, answer).ok).toBe(false);
		const restored = new Controller(store);
		expect(restored.getSnapshot().session!.question).toMatchObject({
			selected: answer,
			correct: true,
		});
		expect(restored.getSnapshot().progress.xp).toBe(10);
	});
	test("test answers can change and never expose correct answers before submission", () => {
		const c = new Controller(memory());
		c.startTest("2026-06");
		const q = c.getSnapshot().session!.question;
		c.answer(q.id, byId.get(q.id)!.answer);
		expect(c.getSnapshot().session!.question.correctAnswer).toBeNull();
		expect(c.getSnapshot().progress.xp).toBe(0);
		expect(
			c.answer(
				q.id,
				q.options.find((x) => x.choice !== byId.get(q.id)!.answer)!.choice,
			).ok,
		).toBe(true);
		expect(c.finish(false).ok).toBe(false);
		c.finish(true);
		expect(c.getSnapshot().result).toMatchObject({
			correct: 0,
			total: 45,
			passed: false,
		});
		expect(c.getSnapshot().review).toHaveLength(45);
	});
	test("a reloaded test keeps its original deadline, expires and refuses late answers", () => {
		let now = 1_000_000;
		const store = memory();
		const c = new Controller(store, () => now);
		c.startTest("2026-06");
		const q = c.getSnapshot().session!.question;
		now += 2_699_000;
		const restored = new Controller(store, () => now);
		expect(restored.getSnapshot().session!.deadline).toBe(3_700_000);
		now += 1000;
		expect(restored.answer(q.id, byId.get(q.id)!.answer).ok).toBe(false);
		expect(restored.getSnapshot()).toMatchObject({
			page: "result",
			canResume: false,
		});
		expect(restored.getSnapshot().result).toMatchObject({
			correct: 0,
			elapsed: 2700,
		});
	});
	test("denied local storage stays usable and a valid backup restores XP", () => {
		const c = new Controller({
			getItem: () => {
				throw new Error();
			},
			setItem: () => {
				throw new Error();
			},
		});
		c.startPractice("daily", 10);
		const q = c.getSnapshot().session!.question;
		c.answer(q.id, byId.get(q.id)!.answer);
		expect(c.getSnapshot().storageError).toMatch(/kan ikke gemmes/);
		const restored = new Controller(memory());
		expect(restored.importProgress(c.exportProgress(), true).ok).toBe(true);
		expect(restored.getSnapshot().progress.xp).toBe(10);
	});
	test("malformed import and forged results leave existing progress intact", () => {
		const c = new Controller(memory());
		c.startPractice("daily", 10);
		const original = c.exportProgress();
		expect(c.importProgress("{}", true).ok).toBe(false);
		expect(c.exportProgress()).toBe(original);
		c.finish(true);
		const forged = JSON.parse(c.exportProgress());
		forged.results[0].passed = true;
		expect(() => parseProgress(JSON.stringify(forged))).toThrow();
		expect(c.reset(false).ok).toBe(false);
		expect(c.reset(true).ok).toBe(true);
		expect(JSON.parse(c.exportProgress())).toEqual(emptyProgress());
	});
	test("corrupt local data does not crash startup", () => {
		const store = memory();
		store.setItem(storageKey, "broken");
		const c = new Controller(store);
		expect(c.getSnapshot()).toMatchObject({ page: "home", bankSize: 570 });
		expect(c.getSnapshot().storageError).toBeTruthy();
	});
});
describe("WebMCP input and page permissions", () => {
	test("unanswered submitted questions are available for mistake practice", () => {
		const c = new Controller(memory());
		c.startPractice("daily", 10);
		c.finish(true);
		expect(c.startPractice("mistakes", 10).ok).toBe(true);
		expect(c.getSnapshot().session!.total).toBe(10);
	});
	test("import rejects undeclared fields rather than exposing them in tool outputs", () => {
		const c = new Controller(memory());
		const data = JSON.parse(c.exportProgress());
		data.extra = "unexpected";
		expect(c.importProgress(JSON.stringify(data), true).ok).toBe(false);
	});
	test("registration is a silent no-op without the native API", () => {
		vi.stubGlobal("document", {});
		expect(() =>
			registerPage(new Controller(memory()), "home")(),
		).not.toThrow();
		vi.unstubAllGlobals();
	});
	test("one native registration rejection does not stop other tools", async () => {
		const names: string[] = [];
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.stubGlobal("document", {
			modelContext: {
				registerTool: async (tool: { name: string }) => {
					names.push(tool.name);
					if (tool.name === "describe") throw new Error("refused");
				},
			},
		});
		const dispose = registerPage(new Controller(memory()), "home");
		await vi.waitFor(() => expect(names).toContain("start_practice"));
		expect(log).toHaveBeenCalledTimes(1);
		dispose();
		log.mockRestore();
		vi.unstubAllGlobals();
	});
	test("every tool rejects malformed and extra fields with a closed error, without changing state", async () => {
		const c = new Controller(memory());
		for (const page of [
			"home",
			"practice",
			"tests",
			"progress",
			"quiz",
			"result",
		] as const) {
			const tools = toolsFor(c, page);
			for (const tool of tools)
				for (const input of [null, [], { unrelated: true }]) {
					const before = c.exportProgress();
					const result = await tool.execute(input);
					expect(result).toHaveProperty("ok", false);
					expect(Object.keys(result as object).toSorted()).toEqual([
						"error",
						"ok",
						"state",
					]);
					expect(c.exportProgress()).toBe(before);
				}
		}
	});
	test("navigate rejects an existing but unallowed page and stale tool calls", async () => {
		const c = new Controller(memory());
		const tools = toolsFor(c, "home");
		const nav = tools.find((x) => x.name === "navigate")!;
		expect(await nav.execute({ page: "quiz" })).toHaveProperty("ok", false);
		expect(await nav.execute({ page: "tests" })).toHaveProperty("ok", true);
		expect(
			await tools
				.find((x) => x.name === "start_practice")!
				.execute({ mode: "daily", count: 10 }),
		).toHaveProperty("ok", false);
		expect(c.getSnapshot().canResume).toBe(false);
	});
	test("only describe is read-only, destructive imports/resets require explicit confirmation", async () => {
		const c = new Controller(memory());
		c.navigate("progress");
		const tools = toolsFor(c, "progress");
		for (const tool of tools)
			expect(tool.annotations.readOnlyHint).toBe(tool.name === "describe");
		const manage = tools.find((x) => x.name === "manage_progress")!;
		expect(manage.annotations.consequentialHint).toBe(true);
		expect(await manage.execute({ action: "reset" })).toHaveProperty(
			"ok",
			false,
		);
		expect(
			await manage.execute({ action: "import", data: "{}" }),
		).toHaveProperty("ok", false);
		const result = (await manage.execute({ action: "export" })) as {
			ok: boolean;
			data: string;
		};
		expect(result.ok).toBe(true);
		expect(parseProgress(result.data)).toEqual(emptyProgress());
	});
});
