import { studySource } from "./data";

export const about = {
	title: "Om Prøveklar",
	author: "Babak Bandpey",
	links: [
		{ label: "Cocode", url: "https://cocode.dk" },
		{ label: "LinkedIn", url: "https://linkedin.com/in/babakbandpey" },
		{ label: "GitHub", url: "https://github.com/cocodedk" },
		{ label: "Appens kildekode", url: "https://github.com/cocodedk/dip" },
	],
	purpose:
		"Prøveklar hjælper dig med at øve til indfødsretsprøven med korte øvelser, gentagelser og tidligere prøver.",
	sections: [
		{
			title: "Tidligere prøver, originale svar",
			paragraphs: [
				"Appen indeholder 570 officielle spørgsmål fra 13 prøver fra sommer 2020 til sommer 2026. Hvert spørgsmål beholder sin prøvedato. I feedbacken finder du links til den originale prøve og det officielle retteark.",
				"Prøveklar er ikke en officiel app. Historiske nyhedsspørgsmål og andre oplysninger kan være forældede. Læs det officielle læremateriale, og følg aktuelle nyheder før din prøve.",
			],
			link: {
				label: "Officielt læremateriale og forberedelse",
				url: studySource,
			},
		},
		{
			title: "Dine svar bliver på din enhed",
			paragraphs: [
				"Du behøver ingen konto. Svar og fremskridt gemmes i browserens lokale lager og sendes ikke til en server. Under Fremskridt kan du gemme en sikkerhedskopi, indlæse den igen eller slette dine fremskridt.",
				"Åbn appen online én gang, og vent på Klar offline. Derefter kan du øve uden internet. De eksterne kildelinks kræver internet.",
			],
			link: null,
		},
		{
			title: "Kildekode og rettigheder",
			paragraphs: [
				"Appens originale kode og egne filer er udgivet under Apache-2.0. Officielle spørgsmål, svar og læremateriale er ikke omfattet af den licens. Vilkårene for videreudgivelse af det officielle materiale er endnu ikke afklaret; se projektets NOTICE.",
			],
			link: {
				label: "Læs NOTICE",
				url: "https://github.com/cocodedk/dip/blob/main/NOTICE",
			},
		},
	],
} as const;
