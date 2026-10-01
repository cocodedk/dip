import { build } from "vite";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { metadataFor, structuredData, site } from "../src/seo.ts";

const output = "node_modules/.cache/proeveklar-prerender";
await build({
	logLevel: "warn",
	build: { ssr: "src/prerender.tsx", outDir: output, emptyOutDir: true },
});
const { render } = await import(pathToFileURL(resolve(output, "prerender.js")));
const template = await readFile("dist/index.html", "utf8");
const image = template.match(/property="og:image" content="([^"]+)"/)[1];
const assets = await readdir("dist/assets");
const font = assets.find(
	(name) =>
		name.startsWith("dm-sans-latin-700-normal-") && name.endsWith(".woff2"),
);
for (const page of ["home", "about"]) {
	let html = template.replace(
		'<div id="root"></div>',
		`<div id="root">${render(page)}</div>`,
	);
	if (font)
		html = html.replace(
			"</head>",
			`<link rel="preload" href="/assets/${font}" as="font" type="font/woff2" crossorigin>\n</head>`,
		);
	if (page === "about") {
		const metadata = metadataFor(page);
		html = html
			.replace(/<title>.*?<\/title>/, `<title>${metadata.title}</title>`)
			.replace(
				/(name="description" content=")[^"]+/,
				`$1${metadata.description}`,
			)
			.replace(/(rel="canonical" href=")[^"]+/, `$1${metadata.url}`)
			.replace(
				/((?:property="og:title"|name="twitter:title") content=")[^"]+/g,
				`$1${metadata.title}`,
			)
			.replace(
				/((?:property="og:description"|name="twitter:description") content=")[^"]+/g,
				`$1${metadata.description}`,
			)
			.replace(/(property="og:url" content=")[^"]+/, `$1${metadata.url}`)
			.replace(
				/(<script[^>]+id="structured-data"[^>]*>)[\s\S]*?(<\/script>)/,
				`$1${JSON.stringify(structuredData(page, image)).replaceAll("<", "\\u003c")}$2`,
			);
		await mkdir("dist/om", { recursive: true });
	}
	await writeFile(
		page === "about" ? "dist/om/index.html" : "dist/index.html",
		html,
	);
}
await writeFile(
	"dist/sitemap.xml",
	`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}/</loc></url><url><loc>${site}/om/</loc></url></urlset>\n`,
);
console.log("Pre-rendered 2 public pages from the real React views.");
