import stylex from "@stylexjs/unplugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { metadataFor, structuredData, site } from "./src/seo.ts";

const image = `${site}/og.png?v=${createHash("sha256").update(readFileSync("public/og.png")).digest("hex").slice(0, 12)}`;

export function seoTags(page: "home" | "about") {
	const metadata = metadataFor(page);
	const alt =
		"Prøveklar: Øv dig til indfødsretsprøven; 570 arkivspørgsmål fra 13 tidligere prøver, gratis og offline.";
	return [
		{ tag: "title", children: metadata.title },
		{
			tag: "meta",
			attrs: { name: "description", content: metadata.description },
		},
		{
			tag: "meta",
			attrs: {
				name: "robots",
				content: "index, follow, max-image-preview:large",
			},
		},
		{ tag: "meta", attrs: { name: "author", content: "Babak Bandpey" } },
		{ tag: "link", attrs: { rel: "canonical", href: metadata.url } },
		...Object.entries({
			type: "website",
			site_name: "Prøveklar",
			title: metadata.title,
			description: metadata.description,
			url: metadata.url,
			image,
			"image:secure_url": image,
			"image:type": "image/png",
			"image:width": "1200",
			"image:height": "630",
			"image:alt": alt,
			locale: "da_DK",
		}).map(([key, content]) => ({
			tag: "meta",
			attrs: { property: `og:${key}`, content },
		})),
		...Object.entries({
			card: "summary_large_image",
			title: metadata.title,
			description: metadata.description,
			image,
			"image:alt": alt,
		}).map(([key, content]) => ({
			tag: "meta",
			attrs: { name: `twitter:${key}`, content },
		})),
		{
			tag: "script",
			attrs: { type: "application/ld+json", id: "structured-data" },
			children: JSON.stringify(structuredData(page, image)).replaceAll(
				"<",
				"\\u003c",
			),
		},
	].map((tag) => ({ ...tag, injectTo: "head" as const }));
}

export default defineConfig(({ mode }) => ({
	plugins:
		mode === "test"
			? []
			: [
					stylex.vite({ useCSSLayers: true }),
					react(),
					{
						name: "public-page-metadata",
						transformIndexHtml: () => seoTags("home"),
					},
				],
	test: { include: ["src/**/*.test.ts"], environment: "node" },
}));
