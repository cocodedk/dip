import { readdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { toolInfo } from "../src/tool-info.ts";

async function files(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	return (
		await Promise.all(
			entries.map((entry) =>
				entry.isDirectory()
					? files(`${dir}/${entry.name}`)
					: `${dir}/${entry.name}`,
			),
		)
	).flat();
}
await writeFile(
	"dist/llms.txt",
	`# Prøveklar\n\n> Offline practice for Denmark's citizenship test using 570 dated official archive questions (2020–2026). Historical news is not current exam preparation.\n\nPublic HTML pages at / and /om/ become a React app when JavaScript loads. Both pages and every app view declare WebMCP tools via document.modelContext; enable WebMCP in Chrome 150+ to discover them. Use getTools() after navigation; input and output are JSON strings. All tools return either {ok:true,state}, {ok:true,data} for export, or {ok:false,error,state}; no third-party service is called. Answers are hidden until practice feedback or a completed test. Test grading requires 36/45 plus 4/5 values (older 40-question tests: 32/40).\n\n## App and source\n\n- [Prøveklar](https://dip.cocode.dk/): Danish practice app; navigate its views with WebMCP tools.\n- [About Prøveklar](https://dip.cocode.dk/om/): Creator Babak Bandpey, sources, privacy, offline use and rights; declares describe, navigate and resume_session when a session exists.\n- [Source repository](https://github.com/cocodedk/dip): Code and documentation; official exam content has separate rights.\n\n## WebMCP tools by view\n\n| Tool | View | Description |\n|---|---|---|\n${toolInfo.map((row) => `| ${row.join(" | ")} |`).join("\n")}\n`,
);
const paths = (await files("dist")).filter((path) => !path.endsWith("/sw.js"));
const hash = createHash("sha256");
for (const path of paths) hash.update(await readFile(path));
const cache = `proeveklar-${hash.digest("hex").slice(0, 12)}`;
const assets = paths.map((path) => `/${path.slice(5)}`);
await writeFile(
	"dist/sw.js",
	`const CACHE = ${JSON.stringify(cache)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('proeveklar-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', event => { if (event.data === 'ACTIVATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') { const path = ['/om', '/om/', '/om/index.html'].includes(new URL(event.request.url).pathname) ? '/om/index.html' : '/index.html'; event.respondWith(caches.open(CACHE).then(cache => cache.match(path)).then(cached => cached || fetch(event.request))); return; }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
`,
);
console.log(`Offline cache: ${assets.length} files, ${cache}`);
