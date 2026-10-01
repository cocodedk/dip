export type Choice = "A" | "B" | "C";
export type Category = "material" | "current" | "values";
export type Page =
	| "home"
	| "practice"
	| "tests"
	| "progress"
	| "about"
	| "quiz"
	| "result";
export type Mode =
	| "daily"
	| "values"
	| "material"
	| "news"
	| "mistakes"
	| "exam"
	| "mock";
export interface Question {
	id: string;
	term: string;
	number: number;
	category: Category;
	question: string;
	options: Partial<Record<Choice, string>>;
	answer: Choice;
	source: string;
	answerSource: string;
	concept: string;
}
export interface Session {
	id: string;
	mode: Mode;
	term: string | null;
	ids: string[];
	index: number;
	answers: Record<string, Choice>;
	revealed: boolean;
	startedAt: number;
	deadline: number | null;
	xpEarned: number;
}
export interface ItemProgress {
	questionId: string;
	correct: number;
	wrong: number;
	correctDays: string[];
	dueAt: number;
	stage: number;
	lastDay: string;
	lastRewardDay: string;
	lastCorrect: boolean;
}
export interface Result {
	id: string;
	mode: Mode;
	term: string | null;
	finishedAt: number;
	elapsed: number;
	ids: string[];
	answers: Record<string, Choice>;
	correct: number;
	valuesCorrect: number;
	valuesCount: number;
	total: number;
	required: number;
	passed: boolean;
	xpEarned: number;
}
export interface Progress {
	version: 1;
	xp: number;
	items: Record<string, ItemProgress>;
	results: Result[];
	active: Session | null;
}
export const isTest = (mode: Mode) => mode === "exam" || mode === "mock";
export const emptyProgress = (): Progress => ({
	version: 1,
	xp: 0,
	items: {},
	results: [],
	active: null,
});
export const pageNames: Record<Page, string> = {
	home: "Hjem",
	practice: "Øv dig",
	tests: "Prøver",
	progress: "Fremskridt",
	about: "Om Prøveklar",
	quiz: "Din øvelse",
	result: "Resultat",
};
