// App actions use real WebMCP; CDP observes the browser lifecycle and offline mode.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";

const legacy = resolve(process.env.OLD_APP_DIR || "/tmp/dip-upgrade-old/dist");
const current = resolve(process.env.NEW_APP_DIR || "dist");
const stale = process.argv.includes("--expect-stale");
const endpoint = process.env.BU_CDP_URL || "http://127.0.0.1:9222";
const base = "http://127.0.0.1:4180/";
const bank = JSON.parse(await readFile("i/data/official-exams.json", "utf8"));
const answers = new Map(bank.map((q) => [q.id, q.answer]));
const expectedCache = (await readFile(current + "/sw.js", "utf8")).match(
	/const CACHE = "([^"]+)"/,
)[1];
let phase = "legacy";
const requests = [];
const checks = [];
const seen = new Set();
const check = (label, condition) => {
	assert.ok(condition, label);
	checks.push(label);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const server = createServer(async (request, response) => {
	const root = phase === "legacy" ? legacy : current;
	const pathname = new URL(request.url, base).pathname;
	const name = pathname.endsWith("/") ? pathname + "index.html" : pathname;
	const file = resolve(root, "." + name);
	if (!file.startsWith(root + "/")) {
		response.writeHead(403).end();
		return;
	}
	requests.push({
		phase,
		pathname,
		cacheControl: request.headers["cache-control"] || null,
	});
	try {
		let body = await readFile(file);
		const mime = {
			".html": "text/html; charset=utf-8",
			".js": "text/javascript",
			".css": "text/css",
			".svg": "image/svg+xml",
			".png": "image/png",
			".woff2": "font/woff2",
			".woff": "font/woff",
			".webmanifest": "application/manifest+json",
		};
		if (extname(file) === ".html")
			body = Buffer.from(
				body
					.toString()
					.replace(
						"</head>",
						'<meta name="proof-deployment" content="' + phase + '"></head>',
					),
			);
		response
			.writeHead(200, {
				"Content-Type": mime[extname(file)] || "text/plain",
				"Cache-Control": "public, max-age=3600",
			})
			.end(body);
	} catch {
		response.writeHead(404).end();
	}
});
await new Promise((resolve) => server.listen(4180, "127.0.0.1", resolve));
const browser = await chromium.connectOverCDP(endpoint);
const context = await browser.newContext();
const page = await context.newPage();
await page.goto("about:blank#upgrade-proof");
const target = (await (await fetch(endpoint + "/json/list")).json()).find(
	(t) => t.url === page.url(),
);
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) =>
	ws.addEventListener("open", resolve, { once: true }),
);
let id = 0;
function send(method, params = {}) {
	return new Promise((resolve, reject) => {
		const requestId = ++id;
		const timeout = setTimeout(() => {
			ws.removeEventListener("message", receive);
			reject(new Error("CDP timeout: " + method));
		}, 15000);
		function receive(event) {
			const message = JSON.parse(String(event.data));
			if (message.id !== requestId) return;
			clearTimeout(timeout);
			ws.removeEventListener("message", receive);
			if (message.error) reject(new Error(message.error.message));
			else resolve(message.result);
		}
		ws.addEventListener("message", receive);
		ws.send(JSON.stringify({ id: requestId, method, params }));
	});
}
async function evaluate(expression) {
	const result = await send("Runtime.evaluate", {
		expression,
		awaitPromise: true,
		returnByValue: true,
	});
	assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
	return result.result.value;
}
async function until(expression) {
	for (let attempt = 0; attempt < 200; attempt++) {
		if (await evaluate(expression)) return;
		await wait(50);
	}
	throw new Error("Browser condition timed out: " + expression);
}
async function call(name, input = {}) {
	await until(
		"document.modelContext && document.modelContext.getTools().then(tools => tools.some(t => t.name === " +
			JSON.stringify(name) +
			"))",
	).catch(() => {
		throw new Error("NOT PROVED: Chrome getTools() missing " + name);
	});
	const value = await evaluate(
		"(async()=>{const tools=await document.modelContext.getTools();return JSON.parse(await document.modelContext.executeTool(tools.find(t=>t.name===" +
			JSON.stringify(name) +
			")," +
			JSON.stringify(JSON.stringify(input)) +
			"));})()",
	);
	assert.ok(value.ok, name + ": " + JSON.stringify(value));
	seen.add(name);
	return value;
}
const state = async () => (await call("describe")).state;
async function reload() {
	const frame = (await send("Page.getFrameTree")).frameTree.frame;
	const loaded = new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			ws.removeEventListener("message", receive);
			reject(new Error("Reload did not finish"));
		}, 15000);
		function receive(event) {
			const message = JSON.parse(String(event.data));
			if (
				message.method !== "Page.lifecycleEvent" ||
				message.params.name !== "load" ||
				message.params.frameId !== frame.id ||
				message.params.loaderId === frame.loaderId
			)
				return;
			clearTimeout(timeout);
			ws.removeEventListener("message", receive);
			resolve();
		}
		ws.addEventListener("message", receive);
	});
	await send("Page.reload", { ignoreCache: false });
	await loaded;
}
try {
	await send("Network.enable");
	await send("Page.enable");
	await send("Page.setLifecycleEventsEnabled", { enabled: true });
	await page.goto(base);
	await evaluate("navigator.serviceWorker.ready.then(()=>true)");
	await until("Boolean(navigator.serviceWorker.controller)");
	const second = await context.newPage();
	await second.goto(base);
	check(
		"Legacy page really displays the original homepage",
		await evaluate(
			'document.querySelector("main").textContent.includes("10 spørgsmål. Tid til at tænke.")',
		),
	);
	await call("start_practice", { mode: "daily", count: 10 });
	const before = (await state()).session;
	await call("answer_question", {
		question_id: before.question.id,
		choice: answers.get(before.question.id),
	});
	phase = "current";
	await reload();
	if (stale) {
		await until(
			"navigator.serviceWorker.getRegistration().then(r=>Boolean(r.waiting))",
		);
		await reload();
		check(
			"Ordinary reload retains the obsolete quiz with another tab open",
			await evaluate(
				'document.querySelector("main").textContent.includes("Svar efter prøvedatoen · officielt arkiv")',
			),
		);
		check(
			"Legacy worker leaves the update waiting",
			await evaluate(
				"navigator.serviceWorker.getRegistration().then(r=>Boolean(r.waiting))",
			),
		);
	} else {
		await until(
			"(async()=>{const r=await navigator.serviceWorker.getRegistration(); const keys=await caches.keys(); return r.active===navigator.serviceWorker.controller && r.active.state==='activated' && !r.waiting && keys.filter(k=>k.startsWith('proeveklar-')).length===1 && keys.includes(" +
				JSON.stringify(expectedCache) +
				");})()",
		);
		check(
			"Update activates while the legacy second tab stays open",
			!second.isClosed(),
		);
		await reload();
		check(
			"Reload uses current HTML instead of HTTP-cached legacy HTML",
			await evaluate(
				'document.querySelector("meta[name=proof-deployment]").content === "current"',
			),
		);
		check(
			"Updated quiz removes old archive line and labels practice",
			await evaluate(
				'document.querySelector("main").textContent.includes("Øvelse · Spørgsmål 1 af 10") && !document.querySelector("main").textContent.includes("Svar efter prøvedatoen · officielt arkiv")',
			),
		);
		const after = await state();
		check(
			"Warm upgrade retains saved practice and feedback",
			after.session.id === before.id &&
				after.session.question.id === before.question.id &&
				after.session.question.selected === answers.get(before.question.id) &&
				after.session.revealed &&
				after.progress.xp === 10,
		);
		await call("finish_session", { confirm: true });
		await call("navigate", { page: "tests" });
		await call("start_test", { term: "2026-06" });
		const exam = (await state()).session;
		await call("answer_question", {
			question_id: exam.question.id,
			choice: answers.get(exam.question.id),
		});
		phase = "later";
		await reload();
		check(
			"Future ordinary reload fetches the latest deployment immediately",
			await evaluate(
				'document.querySelector("meta[name=proof-deployment]").content === "later"',
			),
		);
		const retained = (await state()).session;
		check(
			"Reload preserves active exam answers and its original deadline",
			retained.id === exam.id &&
				retained.deadline === exam.deadline &&
				retained.question.selected === answers.get(exam.question.id),
		);
		// Page-target offline emulation alone does not cut the worker's connection.
		await new Promise((resolve) => server.close(resolve));
		await send("Network.emulateNetworkConditions", {
			offline: true,
			latency: 0,
			downloadThroughput: 0,
			uploadThroughput: 0,
		});
		await page.goto(base + "om/");
		check(
			"Upgraded cache supports offline About reload",
			(await state()).page === "about",
		);
		await page.goto(base);
		await reload();
		check(
			"Fresh precache contains current HTML even with stale HTTP responses",
			await evaluate(
				'document.querySelector("meta[name=proof-deployment]").content === "current"',
			),
		);
		check(
			"Offline reload retains the active exam deadline",
			(await state()).session.deadline === exam.deadline,
		);
		await call("move_question", { index: 1 });
		const next = (await state()).session;
		await call("answer_question", {
			question_id: next.question.id,
			choice: answers.get(next.question.id),
		});
		check(
			"Answers still work offline after the upgrade",
			(await state()).session.answered === 2,
		);
	}
	await mkdir("artifacts", { recursive: true });
	await page.screenshot({
		path: stale
			? "artifacts/upgrade-before.png"
			: "artifacts/upgrade-after.png",
	});
	await writeFile(
		stale ? "artifacts/upgrade-before.json" : "artifacts/upgrade-proof.json",
		JSON.stringify(
			{
				reproduced: stale,
				passed: !stale,
				assertions: checks.length,
				checks,
				tools: [...seen],
				secondTabKeptOpen: true,
				requests,
				date: new Date().toISOString(),
			},
			null,
			2,
		) + "\n",
	);
	console.log(
		checks.length +
			" browser upgrade assertions passed; stale reproduction: " +
			stale,
	);
} catch (error) {
	await mkdir("artifacts", { recursive: true });
	await writeFile(
		"artifacts/upgrade-debug.json",
		JSON.stringify(
			{
				phase,
				checks,
				requests,
				marker: await evaluate(
					'document.querySelector("meta[name=proof-deployment]")?.content',
				),
			},
			null,
			2,
		) + "\n",
	);
	throw error;
} finally {
	ws.close();
	await context.close();
	await browser.close();
	if (server.listening) await new Promise((resolve) => server.close(resolve));
}
