import { about } from "./about-content";
import {
	byId,
	questions,
	terms,
	termName,
	categoryNames,
	archiveNote,
} from "./data";
import { practiceIds, mockIds, recordAnswer, score, stats } from "./learning";
import {
	emptyProgress,
	isTest,
	pageNames,
	type Choice,
	type Mode,
	type Page,
	type Progress,
	type Result,
} from "./model";
import { load, parseProgress, save } from "./storage";

export type Action =
	| { ok: true; state: View }
	| { ok: false; error: string; state: View };
type CurrentQuestion = {
	id: string;
	text: string;
	category: string;
	term: string;
	options: { choice: Choice; text: string }[];
	selected: Choice | null;
	correctAnswer: Choice | null;
	correct: boolean | null;
	source: string;
	answerSource: string | null;
};
export interface View {
	page: Page;
	title: string;
	bankSize: number;
	notice: string;
	about: typeof about | null;
	storageError: string | null;
	progress: ReturnType<typeof stats> & { xp: number };
	session: null | {
		id: string;
		mode: Mode;
		term: string | null;
		index: number;
		total: number;
		answered: number;
		revealed: boolean;
		deadline: number | null;
		answeredIndices: number[];
		question: CurrentQuestion;
	};
	result: Result | null;
	review: {
		id: string;
		text: string;
		selected: string | null;
		answer: string;
		term: string;
		source: string;
		answerSource: string;
	}[];
	tests: { term: string; label: string; total: number; values: number }[];
	history: Result[];
	canResume: boolean;
}
const practiceModes = [
	"daily",
	"values",
	"material",
	"news",
	"mistakes",
] as const;
export class Controller {
	private progress: Progress;
	private page: Page;
	private result: Result | null = null;
	private storageError: string | null;
	private listeners = new Set<() => void>();
	private view: View;
	constructor(
		private storage: Pick<Storage, "getItem" | "setItem"> | null,
		private now = () => Date.now(),
	) {
		const loaded = load(storage);
		this.progress = loaded.progress;
		this.storageError = loaded.error;
		this.page = this.progress.active ? "quiz" : "home";
		this.view = this.makeView();
		this.expire();
	}
	getSnapshot = () => this.view;
	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};
	private makeView(): View {
		const active = this.progress.active;
		const q = active ? byId.get(active.ids[active.index])! : null;
		const revealed = !!active && !isTest(active.mode) && active.revealed;
		return {
			page: this.page,
			title: pageNames[this.page],
			bankSize: questions.length,
			notice: archiveNote,
			about: this.page === "about" ? about : null,
			storageError: this.storageError,
			progress: { ...stats(this.progress, this.now()), xp: this.progress.xp },
			canResume: active !== null,
			session:
				active && q
					? {
							id: active.id,
							mode: active.mode,
							term: active.term,
							index: active.index,
							total: active.ids.length,
							answered: Object.keys(active.answers).length,
							revealed,
							deadline: active.deadline,
							answeredIndices: active.ids.flatMap((id, i) =>
								active.answers[id] ? [i] : [],
							),
							question: {
								id: q.id,
								text: q.question,
								category: categoryNames[q.category],
								term: termName(q.term),
								options: Object.entries(q.options).map(([choice, text]) => ({
									choice: choice as Choice,
									text: text!,
								})),
								selected: active.answers[q.id] ?? null,
								correctAnswer: revealed ? q.answer : null,
								correct: revealed ? active.answers[q.id] === q.answer : null,
								source: q.source,
								answerSource: revealed ? q.answerSource : null,
							},
						}
					: null,
			result: this.result,
			review: this.result
				? this.result.ids
						.filter((id) => this.result!.answers[id] !== byId.get(id)!.answer)
						.map((id) => {
							const item = byId.get(id)!;
							return {
								id,
								text: item.question,
								selected: item.options[this.result!.answers[id]] ?? null,
								answer: item.options[item.answer]!,
								term: termName(item.term),
								source: item.source,
								answerSource: item.answerSource,
							};
						})
				: [],
			tests: terms.map((term) => ({
				term,
				label: termName(term),
				total: questions.filter((x) => x.term === term).length,
				values: questions.filter(
					(x) => x.term === term && x.category === "values",
				).length,
			})),
			history: this.progress.results.slice(0, 12),
		};
	}
	private emit(persist = true): Action {
		if (persist) this.storageError = save(this.storage, this.progress);
		this.view = this.makeView();
		for (const listener of this.listeners) listener();
		return { ok: true, state: this.view };
	}
	reject(error: string): Action {
		return { ok: false, error, state: this.view };
	}
	navigate(page: unknown): Action {
		if (
			!["home", "practice", "tests", "progress", "about"].includes(String(page))
		)
			return this.reject(
				"Vælg Hjem, Øv dig, Prøver, Fremskridt eller Om Prøveklar.",
			);
		this.expire();
		this.page = page as Page;
		return this.emit(false);
	}
	resume(): Action {
		if (!this.progress.active)
			return this.reject("Der er ingen igangværende øvelse.");
		if (this.expire()) return { ok: true, state: this.view };
		this.page = "quiz";
		return this.emit(false);
	}
	startPractice(mode: unknown, count: unknown): Action {
		if (
			!practiceModes.includes(mode as (typeof practiceModes)[number]) ||
			![10, 20, 50].includes(Number(count)) ||
			typeof count !== "number"
		)
			return this.reject("Vælg en øvetype og 10, 20 eller 50 spørgsmål.");
		if (this.progress.active)
			return this.reject("Fortsæt eller afslut din igangværende øvelse først.");
		const ids = practiceIds(mode as Mode, count, this.progress, this.now());
		if (!ids.length)
			return this.reject(
				"Ingen spørgsmål at gentage endnu; start en almindelig øvelse.",
			);
		return this.begin(mode as Mode, null, ids);
	}
	startTest(term: unknown): Action {
		if (term !== "mixed" && !terms.includes(String(term)))
			return this.reject("Vælg en prøve fra listen.");
		if (this.progress.active)
			return this.reject("Fortsæt eller afslut din igangværende øvelse først.");
		const ids =
			term === "mixed"
				? mockIds()
				: questions.filter((q) => q.term === term).map((q) => q.id);
		return this.begin(
			term === "mixed" ? "mock" : "exam",
			term === "mixed" ? null : (term as string),
			ids,
		);
	}
	private begin(mode: Mode, term: string | null, ids: string[]): Action {
		const now = this.now();
		this.progress.active = {
			id: crypto.randomUUID(),
			mode,
			term,
			ids,
			index: 0,
			answers: {},
			revealed: false,
			startedAt: now,
			deadline: isTest(mode) ? now + 45 * 60_000 : null,
			xpEarned: 0,
		};
		this.result = null;
		this.page = "quiz";
		return this.emit();
	}
	answer(questionId: unknown, choice: unknown): Action {
		if (this.page !== "quiz")
			return this.reject("Åbn din igangværende øvelse først.");
		if (this.expire())
			return this.reject("Tiden er udløbet; prøven er afsluttet.");
		const a = this.progress.active;
		if (!a || a.ids[a.index] !== questionId)
			return this.reject("Spørgsmålet er ikke det, der vises nu.");
		const q = byId.get(a.ids[a.index])!;
		if (typeof choice !== "string" || !Object.hasOwn(q.options, choice))
			return this.reject("Vælg en af svarmulighederne.");
		if (!isTest(a.mode) && a.revealed)
			return this.reject(
				"Svaret er allerede afleveret; gå til næste spørgsmål.",
			);
		a.answers[q.id] = choice as Choice;
		if (!isTest(a.mode)) {
			a.xpEarned += recordAnswer(
				this.progress,
				q,
				choice === q.answer,
				this.now(),
			);
			a.revealed = true;
		}
		return this.emit();
	}
	move(index: unknown): Action {
		if (this.page !== "quiz")
			return this.reject("Åbn din igangværende øvelse først.");
		if (this.expire())
			return this.reject("Tiden er udløbet; prøven er afsluttet.");
		const a = this.progress.active;
		if (
			!a ||
			typeof index !== "number" ||
			!Number.isInteger(index) ||
			index < 0 ||
			index >= a.ids.length
		)
			return this.reject("Spørgsmålsnummeret findes ikke.");
		if (!isTest(a.mode) && (index !== a.index + 1 || !a.revealed))
			return this.reject("Svar først, og gå derefter til næste spørgsmål.");
		a.index = index;
		a.revealed = false;
		return this.emit();
	}
	finish(confirm: unknown): Action {
		if (this.page !== "quiz" || !this.progress.active)
			return this.reject("Der er ingen åben øvelse at afslutte.");
		if (confirm !== true)
			return this.reject(
				"Bekræft afslutning med confirm: true; ubesvarede spørgsmål tæller som forkerte.",
			);
		return this.complete();
	}
	private complete(): Action {
		const a = this.progress.active!;
		const now = this.now();
		for (const id of a.ids) {
			const choice = a.answers[id];
			if (isTest(a.mode) || !choice)
				a.xpEarned += recordAnswer(
					this.progress,
					byId.get(id)!,
					choice === byId.get(id)!.answer,
					now,
				);
		}
		this.result = {
			...score(a, Math.min(now, a.deadline ?? now)),
			xpEarned: a.xpEarned,
		};
		this.progress.results = [this.result, ...this.progress.results].slice(
			0,
			100,
		);
		this.progress.active = null;
		this.page = "result";
		return this.emit();
	}
	expire(): boolean {
		const a = this.progress.active;
		if (a?.deadline && this.now() >= a.deadline) {
			this.complete();
			return true;
		}
		return false;
	}
	openResult(id: unknown): Action {
		const result = this.progress.results.find((x) => x.id === id);
		if (!result) return this.reject("Resultatet findes ikke.");
		this.result = result;
		this.page = "result";
		return this.emit(false);
	}
	exportProgress(): string {
		return JSON.stringify(this.progress, null, 2);
	}
	importProgress(text: unknown, confirm: unknown): Action {
		if (confirm !== true || typeof text !== "string")
			return this.reject(
				"Bekræft, at sikkerhedskopien skal erstatte dine fremskridt.",
			);
		try {
			this.progress = parseProgress(text);
		} catch {
			return this.reject(
				"Sikkerhedskopien er ugyldig; dine fremskridt er bevaret.",
			);
		}
		this.result = null;
		this.page = this.progress.active ? "quiz" : "progress";
		this.emit();
		this.expire();
		return { ok: true, state: this.view };
	}
	reset(confirm: unknown): Action {
		if (confirm !== true)
			return this.reject("Bekræft sletning med confirm: true.");
		this.progress = emptyProgress();
		this.result = null;
		this.page = "progress";
		return this.emit();
	}
}
