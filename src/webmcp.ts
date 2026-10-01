import type { Controller } from "./controller";
import type { Page } from "./model";
import { toolInfo } from "./tool-info";

type Schema = {
	type: "object";
	properties: Record<string, unknown>;
	required: string[];
	additionalProperties: false;
};
export interface Tool {
	name: string;
	description: string;
	inputSchema: Schema;
	execute: (input: unknown) => Promise<unknown>;
	annotations: {
		readOnlyHint: boolean;
		untrustedContentHint: boolean;
		consequentialHint: boolean;
	};
}
interface ModelContext {
	registerTool(tool: Tool, options: { signal: AbortSignal }): Promise<void>;
}
declare global {
	interface Document {
		modelContext?: ModelContext;
	}
}

const stringEnum = (values: string[]) => ({ type: "string", enum: values });
const field = (type: string) =>
	type === "string" ? { type, maxLength: 128 } : { type };
const closedInput = (
	properties: Record<string, unknown>,
	required = Object.keys(properties),
): Schema => ({
	type: "object",
	properties,
	required,
	additionalProperties: false,
});
function valid(
	input: unknown,
	schema: Schema,
): input is Record<string, unknown> {
	if (input === null || typeof input !== "object" || Array.isArray(input))
		return false;
	const obj = input as Record<string, unknown>;
	if (
		Object.keys(obj).some((x) => !Object.hasOwn(schema.properties, x)) ||
		schema.required.some((x) => !Object.hasOwn(obj, x))
	)
		return false;
	return Object.entries(obj).every(([key, value]) => {
		const f = schema.properties[key] as {
			type: string;
			enum?: unknown[];
			maxLength?: number;
		};
		return (
			typeof value === (f.type === "integer" ? "number" : f.type) &&
			(f.type !== "integer" || Number.isInteger(value)) &&
			(!f.enum || f.enum.includes(value)) &&
			(typeof value !== "string" ||
				f.maxLength === undefined ||
				value.length <= f.maxLength)
		);
	});
}
export function toolsFor(controller: Controller, page: Page): Tool[] {
	const tools: Tool[] = [];
	const add = (
		name: (typeof toolInfo)[number][0],
		schema: Schema,
		run: (i: Record<string, unknown>) => unknown,
		readOnly = false,
	) => {
		tools.push({
			name,
			description: toolInfo.find((x) => x[0] === name)![2],
			inputSchema: schema,
			annotations: {
				readOnlyHint: readOnly,
				untrustedContentHint: name === "manage_progress",
				consequentialHint: name === "manage_progress",
			},
			execute: async (input) => {
				if (controller.getSnapshot().page !== page)
					return controller.reject(
						"Siden er ændret; hent de aktuelle værktøjer.",
					);
				if (!valid(input, schema))
					return controller.reject(
						"Ugyldige eller ekstra felter; følg inputSchema.",
					);
				try {
					return run(input);
				} catch {
					return controller.reject("Handlingen kunne ikke udføres; prøv igen.");
				}
			},
		});
	};
	add(
		"describe",
		closedInput({}),
		() => ({ ok: true, state: controller.getSnapshot() }),
		true,
	);
	add(
		"navigate",
		closedInput({
			page: stringEnum(["home", "practice", "tests", "progress", "about"]),
		}),
		(i) => controller.navigate(i.page),
	);
	if (
		["home", "practice", "result"].includes(page) &&
		!controller.getSnapshot().canResume
	)
		add(
			"start_practice",
			closedInput({
				mode: stringEnum(["daily", "values", "material", "news", "mistakes"]),
				count: { type: "integer", enum: [10, 20, 50] },
			}),
			(i) => controller.startPractice(i.mode, i.count),
		);
	if (page === "tests" && !controller.getSnapshot().canResume)
		add(
			"start_test",
			closedInput({
				term: stringEnum([
					"mixed",
					...controller.getSnapshot().tests.map((x) => x.term),
				]),
			}),
			(i) => controller.startTest(i.term),
		);
	if (
		["home", "practice", "tests", "progress", "about"].includes(page) &&
		controller.getSnapshot().canResume
	)
		add("resume_session", closedInput({}), () => controller.resume());
	if (page === "quiz") {
		add(
			"answer_question",
			closedInput({
				question_id: field("string"),
				choice: stringEnum(["A", "B", "C"]),
			}),
			(i) => controller.answer(i.question_id, i.choice),
		);
		add("move_question", closedInput({ index: field("integer") }), (i) =>
			controller.move(i.index),
		);
		add("finish_session", closedInput({ confirm: field("boolean") }), (i) =>
			controller.finish(i.confirm),
		);
	}
	if (page === "progress") {
		add("open_result", closedInput({ id: field("string") }), (i) =>
			controller.openResult(i.id),
		);
		add(
			"manage_progress",
			closedInput(
				{
					action: stringEnum(["export", "import", "reset"]),
					data: { type: "string", maxLength: 1_000_000 },
					confirm: field("boolean"),
				},
				["action"],
			),
			(i) => {
				if (i.action === "export")
					return { ok: true, data: controller.exportProgress() };
				return i.action === "import"
					? controller.importProgress(i.data, i.confirm)
					: controller.reset(i.confirm);
			},
		);
	}
	return tools;
}
let previous: AbortController | null = null;
let registrations = Promise.resolve();
export function registerPage(controller: Controller, page: Page) {
	const context = document.modelContext;
	if (!context) return () => {};
	previous?.abort();
	const abort = new AbortController();
	previous = abort;
	registrations = registrations.then(async () => {
		if (abort.signal.aborted) return;
		for (const tool of toolsFor(controller, page)) {
			if (abort.signal.aborted) break;
			try {
				await context.registerTool(tool, { signal: abort.signal });
			} catch (error) {
				if (!abort.signal.aborted)
					console.error("WebMCP registration failed", tool.name, error);
			}
		}
	});
	return () => abort.abort();
}
