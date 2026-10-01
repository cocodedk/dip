import { useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { isTest } from "./model";
import { s } from "./styles";
import { Button } from "./components";
import type { Controller, View, Action } from "./controller";

export function Quiz({
	view,
	controller,
	act,
}: {
	view: View;
	controller: Controller;
	act: (action: Action) => void;
}) {
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		const timer = window.setInterval(() => {
			setNow(Date.now());
			controller.expire();
		}, 1000);
		return () => window.clearInterval(timer);
	}, [controller]);
	const a = view.session;
	if (!a) return null;
	const q = a.question;
	const test = isTest(a.mode);
	const seconds = Math.max(0, Math.ceil(((a.deadline ?? now) - now) / 1000));
	const finish = () => {
		if (
			a.answered < a.total &&
			!window.confirm(
				`${a.total - a.answered} spørgsmål er ubesvarede og tæller som fejl. Afslut alligevel?`,
			)
		)
			return;
		act(controller.finish(true));
	};
	return (
		<>
			<div {...stylex.props(s.row)}>
				<span {...stylex.props(s.eyebrow)} style={{ margin: 0 }}>
					Spørgsmål {a.index + 1} af {a.total}
				</span>
				{test && (
					<time aria-label="Tid tilbage" {...stylex.props(s.pill)}>
						{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
					</time>
				)}
			</div>
			<progress
				aria-label="Spørgsmål besvaret"
				{...stylex.props(s.progress)}
				value={a.answered}
				max={a.total}
			/>
			<div {...stylex.props(s.row)}>
				<span {...stylex.props(s.small, s.muted)}>{q.category}</span>
				<span {...stylex.props(s.small, s.muted)}>{q.term}</span>
			</div>
			<p {...stylex.props(s.small, s.muted)} style={{ margin: "8px 0 0" }}>
				Svar efter prøvedatoen · officielt arkiv
			</p>
			<h1 {...stylex.props(s.question)}>{q.text}</h1>
			<div {...stylex.props(s.stack)} role="group" aria-label="Svarmuligheder">
				{q.options.map((option) => (
					<button
						key={option.choice}
						type="button"
						disabled={a.revealed}
						aria-pressed={q.selected === option.choice}
						{...stylex.props(
							s.choice,
							q.selected === option.choice && s.selected,
							a.revealed && q.correctAnswer === option.choice && s.correct,
							a.revealed &&
								q.selected === option.choice &&
								!q.correct &&
								s.wrong,
						)}
						onClick={() => act(controller.answer(q.id, option.choice))}
					>
						<span {...stylex.props(s.choiceLetter)}>{option.choice}</span>
						<span>{option.text}</span>
					</button>
				))}
			</div>
			{a.revealed && (
				<div role="status" {...stylex.props(s.feedback, !q.correct && s.wrong)}>
					<strong>
						{q.correct ? "Rigtigt husket" : "Her er det officielle arkivsvar"}
					</strong>
					<p style={{ margin: "8px 0" }}>
						{q.options.find((x) => x.choice === q.correctAnswer)?.text}
					</p>
					<p {...stylex.props(s.small, s.muted)}>
						Prøv at sige svaret med dine egne ord. Gentag det på en senere dag.
					</p>
					<a
						{...stylex.props(s.link, s.small)}
						href={q.answerSource!}
						target="_blank"
						rel="noreferrer"
					>
						Se det officielle retteark ↗
					</a>
				</div>
			)}
			<div {...stylex.props(s.actions)}>
				{test && a.index > 0 && (
					<Button secondary onClick={() => act(controller.move(a.index - 1))}>
						← Forrige
					</Button>
				)}
				{a.index < a.total - 1 ? (
					<Button
						disabled={!test && !a.revealed}
						onClick={() => act(controller.move(a.index + 1))}
					>
						Næste spørgsmål →
					</Button>
				) : (
					<Button disabled={!test && !a.revealed} onClick={finish}>
						{test ? "Afslut prøven" : "Se resultat"} →
					</Button>
				)}
			</div>
			{test && (
				<details {...stylex.props(s.card)}>
					<summary>
						Overblik · {a.answered}/{a.total} besvaret
					</summary>
					<div {...stylex.props(s.grid)}>
						{Array.from({ length: a.total }, (_, index) => (
							<button
								key={index}
								type="button"
								aria-label={`Spørgsmål ${index + 1}${a.answeredIndices.includes(index) ? ", besvaret" : ", ubesvaret"}`}
								aria-current={index === a.index ? "step" : undefined}
								{...stylex.props(
									s.jump,
									a.answeredIndices.includes(index) && s.answered,
									index === a.index && s.selected,
								)}
								onClick={() => act(controller.move(index))}
							>
								{index + 1}
							</button>
						))}
					</div>
					<p {...stylex.props(s.small, s.muted)}>
						Markerede felter er besvaret. Du kan ændre dine svar.
					</p>
				</details>
			)}
			<Button secondary onClick={finish}>
				{test ? "Afslut prøven nu" : "Afslut øvelsen nu"}
			</Button>
			<p {...stylex.props(s.notice)}>
				{test
					? "Prøvetiden fortsætter, hvis du forlader denne side. Svar og tidsfrist gemmes lokalt."
					: "Fejl er en del af læringen. Du kan gentage dem fra Øv dig."}
			</p>
		</>
	);
}
