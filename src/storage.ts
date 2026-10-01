import { byId } from "./data";
import { score } from "./learning";
import { emptyProgress, isTest, type Progress, type Session } from "./model";

export const storageKey = "proeveklar.progress.v1";
const object = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value) && value >= 0;
const checkIds = (ids: unknown): ids is string[] =>
	Array.isArray(ids) &&
	ids.length > 0 &&
	ids.length <= 50 &&
	ids.every((id) => typeof id === "string" && byId.has(id)) &&
	new Set(ids).size === ids.length;
const closed = (value: Record<string, unknown>, keys: string[]) =>
	Object.keys(value).every((key) => keys.includes(key));
export function parseProgress(text: string): Progress {
	if (text.length > 1_000_000) throw new Error("Filen er for stor.");
	const data: unknown = JSON.parse(text);
	if (
		!object(data) ||
		!closed(data, ["version", "xp", "items", "results", "active"]) ||
		data.version !== 1 ||
		!finite(data.xp) ||
		!object(data.items) ||
		!Array.isArray(data.results)
	)
		throw new Error("Filen er ikke en gyldig Prøveklar-sikkerhedskopi.");
	if (Object.keys(data.items).length > 2000 || data.results.length > 100)
		throw new Error("Filen har for mange poster.");
	for (const [concept, item] of Object.entries(data.items)) {
		if (
			!object(item) ||
			!closed(item, [
				"questionId",
				"correct",
				"wrong",
				"correctDays",
				"dueAt",
				"stage",
				"lastDay",
				"lastRewardDay",
				"lastCorrect",
			]) ||
			typeof item.questionId !== "string" ||
			!byId.has(item.questionId) ||
			byId.get(item.questionId)!.concept !== concept ||
			!finite(item.correct) ||
			!finite(item.wrong) ||
			!finite(item.dueAt) ||
			!finite(item.stage) ||
			!Number.isInteger(item.correct) ||
			!Number.isInteger(item.wrong) ||
			!Number.isInteger(item.stage) ||
			item.stage > 5 ||
			!Array.isArray(item.correctDays) ||
			item.correctDays.length > 2 ||
			new Set(item.correctDays).size !== item.correctDays.length ||
			item.correctDays.length > item.correct ||
			!item.correctDays.every(
				(x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x),
			) ||
			typeof item.lastDay !== "string" ||
			typeof item.lastRewardDay !== "string" ||
			typeof item.lastCorrect !== "boolean"
		)
			throw new Error("Sikkerhedskopien indeholder ugyldige svar.");
	}
	const checkAnswers = (answers: unknown, ids: string[]) =>
		object(answers) &&
		Object.entries(answers).every(
			([id, answer]) =>
				ids.includes(id) &&
				typeof answer === "string" &&
				Object.hasOwn(byId.get(id)!.options, answer),
		);
	if (data.active !== null) {
		const a = data.active;
		if (
			!object(a) ||
			!closed(a, [
				"id",
				"mode",
				"term",
				"ids",
				"index",
				"answers",
				"revealed",
				"startedAt",
				"deadline",
				"xpEarned",
			]) ||
			typeof a.id !== "string" ||
			!checkIds(a.ids) ||
			!checkAnswers(a.answers, a.ids) ||
			!finite(a.index) ||
			!Number.isInteger(a.index) ||
			a.index >= a.ids.length ||
			![
				"daily",
				"values",
				"material",
				"news",
				"mistakes",
				"exam",
				"mock",
			].includes(String(a.mode)) ||
			typeof a.revealed !== "boolean" ||
			!finite(a.startedAt) ||
			(a.deadline !== null && !finite(a.deadline)) ||
			!finite(a.xpEarned) ||
			(a.term !== null && typeof a.term !== "string")
		)
			throw new Error("Den gemte øvelse er ugyldig.");
		if (
			isTest(a.mode as Session["mode"])
				? a.deadline !== a.startedAt + 45 * 60_000
				: a.deadline !== null
		)
			throw new Error("Den gemte prøvetid er ugyldig.");
	}
	for (const result of data.results) {
		if (
			!object(result) ||
			!closed(result, [
				"id",
				"mode",
				"term",
				"finishedAt",
				"elapsed",
				"ids",
				"answers",
				"correct",
				"valuesCorrect",
				"valuesCount",
				"total",
				"required",
				"passed",
				"xpEarned",
			]) ||
			typeof result.id !== "string" ||
			!checkIds(result.ids) ||
			!checkAnswers(result.answers, result.ids) ||
			!finite(result.correct) ||
			!finite(result.total) ||
			result.total !== result.ids.length ||
			!finite(result.valuesCorrect) ||
			!finite(result.valuesCount) ||
			!finite(result.required) ||
			!finite(result.finishedAt) ||
			!finite(result.elapsed) ||
			!finite(result.xpEarned) ||
			typeof result.passed !== "boolean" ||
			![
				"daily",
				"values",
				"material",
				"news",
				"mistakes",
				"exam",
				"mock",
			].includes(String(result.mode)) ||
			(result.term !== null && typeof result.term !== "string")
		)
			throw new Error("Et gemt resultat er ugyldigt.");
		const computed = score(
			{ ids: result.ids, answers: result.answers } as Session,
			result.finishedAt,
		);
		if (
			["correct", "valuesCorrect", "valuesCount", "required", "passed"].some(
				(key) => result[key] !== computed[key as keyof typeof computed],
			)
		)
			throw new Error("Et gemt resultat har en forkert optælling.");
	}
	return data as unknown as Progress;
}
export function load(storage: Pick<Storage, "getItem"> | null) {
	try {
		const text = storage?.getItem(storageKey);
		return {
			progress: text ? parseProgress(text) : emptyProgress(),
			error: null as string | null,
		};
	} catch {
		return {
			progress: emptyProgress(),
			error: "Gemte fremskridt kunne ikke læses; du kan stadig øve dig.",
		};
	}
}
export function save(
	storage: Pick<Storage, "setItem"> | null,
	progress: Progress,
): string | null {
	try {
		if (!storage) throw new Error("Storage unavailable");
		storage.setItem(storageKey, JSON.stringify(progress));
		return null;
	} catch {
		return "Fremskridt kan ikke gemmes i denne browser; eksportér en sikkerhedskopi inden du lukker.";
	}
}
