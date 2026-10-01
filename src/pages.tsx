import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { View, Action, Controller } from "./controller";
import { s } from "./styles";
import { Button, Row, Rules, ArchiveNotice } from "./components";
import { termName } from "./data";
import { isTest, type Mode } from "./model";

type Props = {
	view: View;
	controller: Controller;
	act: (action: Action) => void;
};
export function Resume({ view, controller, act }: Props) {
	return view.canResume ? (
		<div {...stylex.props(s.card)}>
			<strong>Du har en øvelse i gang</strong>
			<p {...stylex.props(s.muted)}>
				Dine svar er gemt. En prøves 45 minutter fortsætter med at løbe.
			</p>
			<Button secondary onClick={() => act(controller.resume())}>
				Fortsæt øvelsen →
			</Button>
		</div>
	) : null;
}
export function Home(props: Props) {
	const { view, controller, act } = props;
	return (
		<>
			<section {...stylex.props(s.card, s.hero)}>
				<p {...stylex.props(s.eyebrow, s.heroMuted)}>Et skridt ad gangen</p>
				<h1 {...stylex.props(s.title)}>
					Øv dig til
					<br />
					indfødsretsprøven.
				</h1>
				<p {...stylex.props(s.lead, s.heroMuted)}>
					Lær Danmark at kende med tidligere prøver.
					<br />
					10 spørgsmål. Tid til at tænke.
				</p>
				<Button
					disabled={view.canResume}
					onClick={() => act(controller.startPractice("daily", 10))}
				>
					Start dagens øvelse <span aria-hidden="true">→</span>
				</Button>
				<p
					{...stylex.props(s.small, s.heroMuted)}
					style={{ margin: "14px 0 0" }}
				>
					570 officielle arkivspørgsmål · 2020–2026
				</p>
			</section>
			<Resume {...props} />
			<Rules />
			<div {...stylex.props(s.stack)}>
				<Row
					title="Danske værdier"
					text="Træn den del med sit eget beståelseskrav"
					onClick={() => act(controller.startPractice("values", 10))}
				/>
				<Row
					title="Gentag dine fejl"
					text={
						view.progress.mistakes
							? `${view.progress.mistakes} emner venter på et nyt forsøg`
							: "En fejl er et godt sted at lære mere"
					}
					onClick={() => act(controller.startPractice("mistakes", 10))}
				/>
				<Row
					title="Prøv en tidligere prøve"
					text="13 originale prøver med officielle svar"
					onClick={() => act(controller.navigate("tests"))}
				/>
			</div>
			<ArchiveNotice />
		</>
	);
}
export function Practice(props: Props) {
	const { controller, act } = props;
	const [count, setCount] = useState(10);
	const rows: { mode: Mode; title: string; text: string }[] = [
		{
			mode: "daily",
			title: "Dagens blanding",
			text: "Gentagelser først, derefter nye spørgsmål",
		},
		{
			mode: "values",
			title: "Danske værdier",
			text: "Demokrati, frihed, ligestilling og rettigheder",
		},
		{
			mode: "material",
			title: "Historie, samfund og kultur",
			text: "Spørgsmål fra prøvernes lærematerialedel",
		},
		{
			mode: "mistakes",
			title: "Gentag fejl",
			text: "Spørgsmål, du sidst svarede forkert på",
		},
		{
			mode: "news",
			title: "Historiske nyheder",
			text: "Svar efter prøvedatoen; dette er arkivtræning",
		},
	];
	return (
		<>
			<p {...stylex.props(s.eyebrow)}>Husk mere med gentagelser</p>
			<h1 {...stylex.props(s.title)}>Øv dig</h1>
			<p {...stylex.props(s.lead)}>
				Svar først. Se derefter det officielle arkivsvar. Gentag spørgsmålene på
				senere dage.
			</p>
			<Resume {...props} />
			<div {...stylex.props(s.section)}>
				<label htmlFor="count" {...stylex.props(s.label)}>
					Spørgsmål pr. øvelse
				</label>
				<select
					id="count"
					value={count}
					onChange={(e) => setCount(Number(e.target.value))}
					{...stylex.props(s.select)}
				>
					<option value="10">10 spørgsmål</option>
					<option value="20">20 spørgsmål</option>
					<option value="50">50 spørgsmål</option>
				</select>
				<p {...stylex.props(s.small, s.muted)}>
					En lille kategori kan have færre forskellige spørgsmål.
				</p>
			</div>
			<div {...stylex.props(s.stack)}>
				{rows.map((row) => (
					<Row
						key={row.mode}
						title={row.title}
						text={row.text}
						onClick={() => act(controller.startPractice(row.mode, count))}
					/>
				))}
			</div>
			<ArchiveNotice />
		</>
	);
}
export function Tests(props: Props) {
	const { view, controller, act } = props;
	return (
		<>
			<p {...stylex.props(s.eyebrow)}>45 minutter · ro til at tænke</p>
			<h1 {...stylex.props(s.title)}>Tidligere prøver</h1>
			<p {...stylex.props(s.lead)}>
				Du kan ændre svar undervejs. Facit vises efter afslutning; ubesvarede
				spørgsmål tæller som fejl.
			</p>
			<Resume {...props} />
			<Rules />
			<section {...stylex.props(s.card)}>
				<h2 {...stylex.props(s.heading)}>Blandet arkivprøve</h2>
				<p {...stylex.props(s.muted)}>
					35 spørgsmål fra lærematerialet, 5 historiske nyheder og 5 om værdier.
					Nyhederne kommer fra forskellige prøvedatoer.
				</p>
				<Button
					disabled={view.canResume}
					onClick={() => act(controller.startTest("mixed"))}
				>
					Start 45 spørgsmål →
				</Button>
			</section>
			<h2 {...stylex.props(s.heading)}>Originale officielle prøver</h2>
			<div {...stylex.props(s.stack)}>
				{view.tests.map((test) => (
					<Row
						key={test.term}
						title={test.label}
						text={`${test.total} spørgsmål · ${test.values === 5 ? "36 i alt og 4/5 værdier" : "32 rigtige, intet separat værdikrav"}`}
						onClick={() => act(controller.startTest(test.term))}
					/>
				))}
			</div>
			<ArchiveNotice />
		</>
	);
}
export function ResultPage({ view, controller, act }: Props) {
	const result = view.result;
	if (!result) return null;
	const test = isTest(result.mode);
	return (
		<>
			<p {...stylex.props(s.eyebrow)}>
				{result.term
					? termName(result.term)
					: test
						? "Blandet arkivprøve"
						: "Øvelsen er afsluttet"}
			</p>
			<h1 {...stylex.props(s.title)}>
				{test
					? result.passed
						? "Bestået øveprøve"
						: "Prøv igen, og lær videre"
					: "Du er et skridt videre"}
			</h1>
			<section {...stylex.props(s.card)}>
				<div {...stylex.props(s.resultScore)}>
					{result.correct}
					<span {...stylex.props(s.number, s.muted)}>/{result.total}</span>
				</div>
				<p {...stylex.props(s.muted)}>rigtige svar · +{result.xpEarned} XP</p>
				{test && (
					<div {...stylex.props(s.stack)}>
						<p>
							<strong>
								{result.correct >= result.required ? "✓" : "✕"} Samlet:
							</strong>{" "}
							{result.correct} rigtige; kravet er {result.required}.
						</p>
						{result.valuesCount === 5 && (
							<p>
								<strong>
									{result.valuesCorrect >= 4 ? "✓" : "✕"} Værdier:
								</strong>{" "}
								{result.valuesCorrect}/5; kravet er 4/5.
							</p>
						)}
						<p {...stylex.props(s.small, s.muted)}>
							Dette er et øveresultat ud fra historiske svar, ikke en officiel
							bedømmelse eller afgørelse om statsborgerskab.
						</p>
					</div>
				)}
			</section>
			<div {...stylex.props(s.stack)}>
				<Button
					onClick={() =>
						act(
							controller.startPractice(
								view.review.length ? "mistakes" : "daily",
								10,
							),
						)
					}
				>
					{view.review.length
						? "Gentag spørgsmål, du havde svært ved"
						: "Tag en ny øvelse"}{" "}
					→
				</Button>
				<Button secondary onClick={() => act(controller.navigate("progress"))}>
					Se dine fremskridt
				</Button>
			</div>
			{view.review.length > 0 && (
				<section {...stylex.props(s.section)}>
					<h2 {...stylex.props(s.heading)}>Lær af dine svar</h2>
					{view.review.map((item) => (
						<article key={item.id} {...stylex.props(s.reviewItem)}>
							<p {...stylex.props(s.small, s.muted)}>{item.term}</p>
							<strong>{item.text}</strong>
							<p {...stylex.props(s.muted)} style={{ margin: "8px 0" }}>
								Dit svar: {item.selected ?? "Ikke besvaret"}
							</p>
							<p {...stylex.props(s.value)}>
								Arkivsvar: <strong>{item.answer}</strong>
							</p>
							<a
								{...stylex.props(s.link, s.small)}
								href={item.answerSource}
								target="_blank"
								rel="noreferrer"
							>
								Officielt retteark ↗
							</a>
						</article>
					))}
				</section>
			)}
			<ArchiveNotice />
		</>
	);
}
