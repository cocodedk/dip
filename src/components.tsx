import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { s } from "./styles";
import { archiveNote, studySource } from "./data";
import type { Page } from "./model";

export function Button({
	children,
	onClick,
	secondary = false,
	disabled = false,
}: {
	children: ReactNode;
	onClick: () => void;
	secondary?: boolean;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			{...stylex.props(s.primary, secondary && s.secondary)}
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</button>
	);
}
export function Row({
	title,
	text,
	onClick,
}: {
	title: string;
	text: string;
	onClick: () => void;
}) {
	return (
		<button type="button" {...stylex.props(s.rowButton)} onClick={onClick}>
			<span>
				<strong>{title}</strong>
				<span {...stylex.props(s.muted)} style={{ display: "block" }}>
					{text}
				</span>
			</span>
			<span aria-hidden="true" {...stylex.props(s.arrow)}>
				→
			</span>
		</button>
	);
}
export function ArchiveNotice() {
	return (
		<aside {...stylex.props(s.notice)}>
			{archiveNote} Læs også{" "}
			<a
				{...stylex.props(s.link)}
				href={studySource}
				target="_blank"
				rel="noreferrer"
			>
				det officielle læremateriale fra august 2026
			</a>
			, og følg aktuelle nyheder før din prøve.
		</aside>
	);
}
export function Rules() {
	return (
		<section aria-label="Prøvens to krav" {...stylex.props(s.split)}>
			<div {...stylex.props(s.stat, s.rule)}>
				<div {...stylex.props(s.number)}>
					36<span {...stylex.props(s.muted)}>/45</span>
				</div>
				<strong>rigtige i alt</strong>
				<div {...stylex.props(s.small, s.muted)}>Begge krav skal opfyldes</div>
			</div>
			<div {...stylex.props(s.stat, s.ruleGreen)}>
				<div {...stylex.props(s.number, s.value)}>
					4<span {...stylex.props(s.muted)}>/5</span>
				</div>
				<strong>rigtige om værdier</strong>
				<div {...stylex.props(s.small, s.muted)}>
					To fejl her betyder ikke bestået
				</div>
			</div>
		</section>
	);
}
function Icon({ page }: { page: Page }) {
	const paths: Partial<Record<Page, ReactNode>> = {
		home: (
			<>
				<path d="m3 10 9-7 9 7v10H3Z" />
				<path d="M9 20v-7h6v7" />
			</>
		),
		practice: (
			<>
				<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3Z" />
				<path d="M12 6v16M6 9h3M15 9h3" />
			</>
		),
		tests: (
			<>
				<rect x="5" y="4" width="14" height="18" rx="2" />
				<path d="M9 2h6v4H9ZM8 11h8M8 15h8M8 19h5" />
			</>
		),
		about: (
			<>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 11v6M12 7h.01" />
			</>
		),
		progress: (
			<>
				<path d="M4 21V10h4v11M10 21V5h4v16M16 21V2h4v19" />
			</>
		),
	};
	return (
		<svg
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{paths[page]}
		</svg>
	);
}
export function Nav({
	page,
	navigate,
}: {
	page: Page;
	navigate: (page: Page) => void;
}) {
	return (
		<nav aria-label="Hovednavigation" {...stylex.props(s.nav)}>
			<div {...stylex.props(s.navInner)}>
				{(
					[
						["home", "Hjem"],
						["practice", "Øv dig"],
						["tests", "Prøver"],
						["progress", "Fremskridt"],
						["about", "Om"],
					] as const
				).map(([target, label]) =>
					target === "home" || target === "about" ? (
						<a
							key={target}
							href={target === "about" ? "/om/" : "/"}
							aria-current={page === target ? "page" : undefined}
							{...stylex.props(s.navButton, page === target && s.navActive)}
							onClick={(event) => {
								if (
									event.button !== 0 ||
									event.metaKey ||
									event.ctrlKey ||
									event.shiftKey ||
									event.altKey
								)
									return;
								event.preventDefault();
								navigate(target);
							}}
						>
							<Icon page={target} />
							{label}
						</a>
					) : (
						<button
							key={target}
							type="button"
							aria-current={page === target ? "page" : undefined}
							{...stylex.props(s.navButton, page === target && s.navActive)}
							onClick={() => navigate(target)}
						>
							<Icon page={target} />
							{label}
						</button>
					),
				)}
			</div>
		</nav>
	);
}
