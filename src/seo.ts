export const site = "https://dip.cocode.dk";

export function pageForPath(path: string) {
	return /^\/om(?:\/|\/index\.html)?$/.test(path) ? "about" : "home";
}

export function metadataFor(page: "home" | "about") {
	const path = page === "about" ? "/om/" : "/";
	return {
		path,
		url: `${site}${path}`,
		title:
			page === "about"
				? "Om Prøveklar: Babak Bandpey, kilder, offline og privatliv"
				: "Indfødsretsprøven: gratis øvelse med arkiv | Prøveklar",
		description:
			page === "about"
				? "Prøveklar er lavet af Babak Bandpey fra Cocode. Læs om de officielle arkivkilder, lokal lagring, offline brug og rettigheder til spørgsmål og kildekode."
				: "Øv dig til indfødsretsprøven med 570 spørgsmål fra tidligere prøver. Træn danske værdier, tag prøver på tid og gem fremskridt lokalt – gratis og offline.",
	};
}

export function structuredData(page: "home" | "about", image: string) {
	const metadata = metadataFor(page);
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"@id": `${site}/#website`,
				url: `${site}/`,
				name: "Prøveklar",
				alternateName: "dip",
				inLanguage: "da",
				publisher: { "@id": `${site}/#organization` },
			},
			{
				"@type": page === "about" ? "AboutPage" : "WebPage",
				"@id": `${metadata.url}#webpage`,
				url: metadata.url,
				name: metadata.title,
				description: metadata.description,
				inLanguage: "da",
				isPartOf: { "@id": `${site}/#website` },
				mainEntity: { "@id": `${site}/#app` },
				primaryImageOfPage: { "@id": `${site}/#image` },
			},
			{
				"@type": "WebApplication",
				"@id": `${site}/#app`,
				name: "Prøveklar",
				url: `${site}/`,
				description:
					"Gratis dansk øvelse med 570 officielle, daterede arkivspørgsmål fra 2020–2026; historiske nyheder er ikke aktuelt pensum.",
				applicationCategory: "EducationalApplication",
				operatingSystem: "Web",
				inLanguage: "da",
				isAccessibleForFree: true,
				offers: { "@type": "Offer", price: 0, priceCurrency: "DKK" },
				author: { "@id": `${site}/#author` },
				publisher: { "@id": `${site}/#organization` },
			},
			{
				"@type": "SoftwareSourceCode",
				"@id": `${site}/#source`,
				name: "Prøveklar kildekode",
				codeRepository: "https://github.com/cocodedk/dip",
				programmingLanguage: ["TypeScript", "JavaScript"],
				targetProduct: { "@id": `${site}/#app` },
				author: { "@id": `${site}/#author` },
			},
			{
				"@type": "Person",
				"@id": `${site}/#author`,
				name: "Babak Bandpey",
				url: "https://linkedin.com/in/babakbandpey",
				sameAs: [
					"https://github.com/cocodedk",
					"https://linkedin.com/in/babakbandpey",
				],
			},
			{
				"@type": "Organization",
				"@id": `${site}/#organization`,
				name: "Cocode",
				url: "https://cocode.dk",
			},
			{
				"@type": "ImageObject",
				"@id": `${site}/#image`,
				url: image,
				contentUrl: image,
				width: 1200,
				height: 630,
				caption:
					"Prøveklar: øv dig til indfødsretsprøven med tidligere prøver.",
			},
		],
	};
}
