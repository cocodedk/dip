import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { Action, Controller, View } from "./controller";
import { s } from "./styles";
import { Button, Row } from "./components";
import { Resume } from "./pages";
import { termName } from "./data";
import { isTest } from "./model";

export function ProgressPage(props: {
	view: View;
	controller: Controller;
	act: (action: Action) => void;
}) {
	const { view, controller, act } = props;
	const [backup, setBackup] = useState("");
	const [backupMessage, setBackupMessage] = useState("");
	const p = view.progress;
	const exportBackup = () => {
		const data = controller.exportProgress();
		setBackup(data);
		const url = URL.createObjectURL(
			new Blob([data], { type: "application/json" }),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = "proeveklar-sikkerhedskopi.json";
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 1000);
		setBackupMessage("Sikkerhedskopien er klar; du kan også kopiere teksten.");
	};
	const importBackup = () => {
		if (
			!window.confirm("Erstat alle lokale fremskridt med denne sikkerhedskopi?")
		)
			return;
		const result = controller.importProgress(backup, true);
		act(result);
		if (result.ok) setBackupMessage("Sikkerhedskopien er indlæst.");
	};
	return (
		<>
			<p {...stylex.props(s.eyebrow)}>Dine fremskridt · kun på din enhed</p>
			<h1 {...stylex.props(s.title)}>{p.rank}</h1>
			<p {...stylex.props(s.lead)}>
				Rang bygger på forskellige emner, du har svaret rigtigt på mindst to
				forskellige dage.
			</p>
			<section {...stylex.props(s.card)}>
				<div {...stylex.props(s.row)}>
					<div>
						<div {...stylex.props(s.number)}>{p.mastered}</div>
						<span {...stylex.props(s.muted)}>emner gentaget rigtigt</span>
					</div>
					<span {...stylex.props(s.pill)}>{p.xp} XP</span>
				</div>
				{p.nextAt !== null && (
					<>
						<progress
							aria-label={`Fremskridt mod rang ${p.nextRank}`}
							{...stylex.props(s.progress)}
							value={p.mastered}
							max={p.nextAt}
						/>
						<p {...stylex.props(s.small, s.muted)}>
							{p.nextAt - p.mastered} emner til {p.nextRank}
						</p>
					</>
				)}
				<p {...stylex.props(s.small, s.muted)}>
					10 XP første gang rigtigt; 4 XP ved en senere dags gentagelse. Samme
					dag giver ingen ekstra XP. Rang og XP er motivation, ikke en vurdering
					af om du består.
				</p>
			</section>
			<div {...stylex.props(s.split)}>
				<div {...stylex.props(s.stat)}>
					<div {...stylex.props(s.number)}>{p.today}</div>
					<span {...stylex.props(s.muted)}>emner øvet i dag</span>
				</div>
				<div {...stylex.props(s.stat)}>
					<div {...stylex.props(s.number)}>{p.due}</div>
					<span {...stylex.props(s.muted)}>klar til gentagelse</span>
				</div>
			</div>
			<Resume {...props} />
			<section {...stylex.props(s.section)}>
				<h2 {...stylex.props(s.heading)}>Seneste øvelser</h2>
				{view.history.length ? (
					<div {...stylex.props(s.stack)}>
						{view.history.map((result) => (
							<Row
								key={result.id}
								title={
									result.term
										? termName(result.term)
										: result.mode === "mock"
											? "Blandet arkivprøve"
											: "Øvelse"
								}
								text={`${result.correct}/${result.total} rigtige${isTest(result.mode) ? (result.passed ? " · bestået" : " · ikke bestået") : ""} · ${new Date(result.finishedAt).toLocaleDateString("da-DK")}`}
								onClick={() => act(controller.openResult(result.id))}
							/>
						))}
					</div>
				) : (
					<p {...stylex.props(s.muted)}>
						Din første afsluttede øvelse vises her.
					</p>
				)}
			</section>
			<section {...stylex.props(s.card)}>
				<h2 {...stylex.props(s.heading)}>Gem en sikkerhedskopi</h2>
				<p {...stylex.props(s.muted)}>
					Fremskridt ligger i denne browsers lokale lager. Eksportér dem, når du
					vil skifte enhed eller rydde browseren.
				</p>
				<Button secondary onClick={exportBackup}>
					Eksportér fremskridt
				</Button>
				<label
					htmlFor="backup"
					{...stylex.props(s.label)}
					style={{ marginTop: 20 }}
				>
					Sikkerhedskopi som JSON
				</label>
				<textarea
					id="backup"
					value={backup}
					onChange={(e) => setBackup(e.target.value)}
					maxLength={1_000_000}
					placeholder="Indsæt din sikkerhedskopi her"
					{...stylex.props(s.textarea)}
				/>
				<Button secondary disabled={!backup.trim()} onClick={importBackup}>
					Indlæs sikkerhedskopi
				</Button>
				{backupMessage && (
					<p role="status" {...stylex.props(s.notice)}>
						{backupMessage}
					</p>
				)}
				<div {...stylex.props(s.section)}>
					<Button
						secondary
						onClick={() => {
							if (
								window.confirm(
									"Slet alle fremskridt og den igangværende øvelse på denne enhed?",
								)
							) {
								act(controller.reset(true));
								setBackup("");
								setBackupMessage("Fremskridt er nulstillet.");
							}
						}}
					>
						Nulstil fremskridt
					</Button>
				</div>
			</section>
		</>
	);
}
