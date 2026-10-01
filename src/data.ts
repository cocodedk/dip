import original from "../i/data/official-exams.json";
import type { Category, Question } from "./model";

const normal = (value: string) =>
	value.toLocaleLowerCase("da").replace(/[^\p{L}\p{N}]/gu, "");
export const questions: Question[] = original.map((q) => ({
	...q,
	concept: normal(q.question + q.options[q.answer as keyof typeof q.options]),
})) as Question[];
export const byId = new Map(questions.map((q) => [q.id, q]));
export const categoryNames: Record<Category, string> = {
	material: "Historie, samfund og kultur",
	current: "Nyheder fra prøvedatoen",
	values: "Danske værdier",
};
export const terms = [...new Set(questions.map((q) => q.term))]
	.toSorted()
	.toReversed();
export function termName(term: string): string {
	return `${term.endsWith("11") ? "Vinter" : "Sommer"} ${term.slice(0, 4)}`;
}
export const officialSite =
	"https://danskogproever.dk/borger/indfoedsretsproeve-statsborgerskab/";
export const studySource = `${officialSite}forberedelse-til-indfoedsretsproeven/`;
export const archiveNote =
	"Spørgsmål og svar er fra tidligere officielle prøver; nyheder og andre forhold kan have ændret sig siden prøvedatoen.";
