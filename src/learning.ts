import { byId, questions } from "./data";
import type {
	ItemProgress,
	Mode,
	Progress,
	Question,
	Result,
	Session,
} from "./model";

export function dayKey(now: number) {
	return new Intl.DateTimeFormat("sv-SE", {
		timeZone: "Europe/Copenhagen",
	}).format(new Date(now));
}
const intervals = [1, 3, 7, 14, 30];
export function recordAnswer(
	progress: Progress,
	q: Question,
	correct: boolean,
	now: number,
): number {
	const day = dayKey(now);
	const item: ItemProgress = progress.items[q.concept] ?? {
		questionId: q.id,
		correct: 0,
		wrong: 0,
		correctDays: [],
		dueAt: now,
		stage: 0,
		lastDay: "",
		lastRewardDay: "",
		lastCorrect: false,
	};
	let xp = 0;
	if (correct) {
		xp = item.correct === 0 ? 10 : item.lastRewardDay !== day ? 4 : 0;
		item.correct += 1;
		if (!item.correctDays.includes(day))
			item.correctDays = [...item.correctDays, day].slice(-2);
		if (item.lastDay !== day)
			item.stage = Math.min(item.stage + 1, intervals.length);
		item.lastRewardDay = day;
	} else {
		item.wrong += 1;
		item.stage = 0;
	}
	item.dueAt = now + intervals[Math.max(0, item.stage - 1)] * 86_400_000;
	item.lastDay = day;
	item.lastCorrect = correct;
	item.questionId = q.id;
	progress.items[q.concept] = item;
	progress.xp += xp;
	return xp;
}

export function score(session: Session, now: number): Result {
	const qs = session.ids.map((id) => byId.get(id)!);
	const correct = qs.filter((q) => session.answers[q.id] === q.answer).length;
	const values = qs.filter((q) => q.category === "values");
	const valuesCorrect = values.filter(
		(q) => session.answers[q.id] === q.answer,
	).length;
	const required = Math.ceil(qs.length * 0.8);
	return {
		id: session.id,
		mode: session.mode,
		term: session.term,
		ids: session.ids,
		answers: { ...session.answers },
		correct,
		valuesCorrect,
		valuesCount: values.length,
		total: qs.length,
		required,
		passed: correct >= required && (values.length !== 5 || valuesCorrect >= 4),
		finishedAt: now,
		elapsed: Math.max(0, Math.round((now - session.startedAt) / 1000)),
		xpEarned: 0,
	};
}

export function shuffled<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}
export function unique(items: Question[]) {
	const seen = new Set<string>();
	return items.filter(
		(q) => !seen.has(q.concept) && Boolean(seen.add(q.concept)),
	);
}
export function practiceIds(
	mode: Mode,
	count: number,
	progress: Progress,
	now: number,
): string[] {
	const pool = unique(
		questions.toReversed().filter((q) => {
			if (mode === "values") return q.category === "values";
			if (mode === "material") return q.category === "material";
			if (mode === "news") return q.category === "current";
			if (mode === "mistakes")
				return progress.items[q.concept]?.lastCorrect === false;
			return q.category !== "current";
		}),
	);
	const sorted = shuffled(pool).toSorted((a, b) => {
		const priority = (q: Question) => {
			const item = progress.items[q.concept];
			return item && item.dueAt <= now ? 0 : !item ? 1 : 2;
		};
		return priority(a) - priority(b);
	});
	return sorted.slice(0, count).map((q) => q.id);
}
export function mockIds(): string[] {
	return ["material", "current", "values"].flatMap((category, index) =>
		shuffled(
			unique(questions.toReversed().filter((q) => q.category === category)),
		)
			.slice(0, [35, 5, 5][index])
			.map((q) => q.id),
	);
}
export function stats(progress: Progress, now: number) {
	const items = Object.values(progress.items);
	const mastered = items.filter((x) => x.correctDays.length >= 2).length;
	const levels = [
		{ at: 0, name: "Begynder" },
		{ at: 25, name: "Opdager" },
		{ at: 100, name: "Øver" },
		{ at: 200, name: "Kender" },
		{ at: 300, name: "Fordyber" },
	];
	const rank = levels.filter((x) => mastered >= x.at).at(-1)!;
	const next = levels.find((x) => x.at > mastered) ?? null;
	return {
		mastered,
		rank: rank.name,
		nextRank: next?.name ?? null,
		nextAt: next?.at ?? null,
		seen: items.length,
		due: items.filter((x) => x.dueAt <= now).length,
		mistakes: items.filter((x) => !x.lastCorrect).length,
		today: items.filter((x) => x.lastDay === dayKey(now)).length,
		passedTests: progress.results.filter(
			(x) => (x.mode === "exam" || x.mode === "mock") && x.passed,
		).length,
	};
}
