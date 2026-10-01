import * as stylex from "@stylexjs/stylex";
import { about } from "./about-content";
import type { View, Action, Controller } from "./controller";
import { Resume } from "./pages";
import { s } from "./styles";

export function AboutPage(props: {
	view: View;
	controller: Controller;
	act: (action: Action) => void;
}) {
	return (
		<>
			<h1 {...stylex.props(s.title)}>{about.title}</h1>
			<p {...stylex.props(s.lead)}>{about.purpose}</p>
			<section {...stylex.props(s.card)} aria-label="Om udvikleren">
				<p {...stylex.props(s.muted)}>Lavet af</p>
				<h2 {...stylex.props(s.heading)}>{about.author}</h2>
				<div {...stylex.props(s.aboutLinks)}>
					{about.links.map((link) => (
						<a
							key={link.url}
							{...stylex.props(s.link)}
							href={link.url}
							target="_blank"
							rel="noreferrer"
						>
							{link.label}
						</a>
					))}
				</div>
			</section>
			<Resume {...props} />
			{about.sections.map((section) => (
				<section key={section.title} {...stylex.props(s.section)}>
					<h2 {...stylex.props(s.heading)}>{section.title}</h2>
					{section.paragraphs.map((text) => (
						<p key={text} {...stylex.props(s.lead)}>
							{text}
						</p>
					))}
					{section.link && (
						<a
							{...stylex.props(s.link)}
							href={section.link.url}
							target="_blank"
							rel="noreferrer"
						>
							{section.link.label}
						</a>
					)}
				</section>
			))}
		</>
	);
}
