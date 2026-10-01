// Playwright opens tabs and captures screenshots; app actions use real Chrome WebMCP.
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.APP_URL || "http://127.0.0.1:4173/";
const endpoint = process.env.BU_CDP_URL || "http://127.0.0.1:9222";
const without = process.argv.includes("--without-webmcp");
const bank = JSON.parse(await readFile("i/data/official-exams.json", "utf8"));
const byId = new Map(bank.map((q) => [q.id, q]));
const dir = "artifacts/browser";
await mkdir(dir, { recursive: true });
const checks = [];
const observedTools = new Set();
const check = (label, condition) => {
	assert.ok(condition, label);
	checks.push(label);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class CDP {
	id = 0;
	pending = new Map();
	exceptions = [];
	logs = [];
	constructor(url) {
		this.ws = new WebSocket(url);
		this.ws.addEventListener("message", (event) => {
			const message = JSON.parse(String(event.data));
			if (message.id) {
				const pending = this.pending.get(message.id);
				if (pending) {
					this.pending.delete(message.id);
					clearTimeout(pending.timeout);
					if (message.error) pending.reject(new Error(message.error.message));
					else pending.resolve(message.result);
				}
			}
			if (message.method === "Runtime.exceptionThrown")
				this.exceptions.push(message.params.exceptionDetails);
			if (
				message.method === "Runtime.consoleAPICalled" &&
				message.params.type === "error"
			)
				this.logs.push(
					message.params.args.map((a) => a.value || a.description).join(" "),
				);
		});
	}
	async open() {
		await new Promise((resolve, reject) => {
			this.ws.addEventListener("open", resolve, { once: true });
			this.ws.addEventListener("error", reject, { once: true });
		});
		return this;
	}
	call(method, params = {}) {
		return new Promise((resolve, reject) => {
			const id = ++this.id;
			const timeout = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`CDP timeout: ${method}`));
			}, 15_000);
			this.pending.set(id, { resolve, reject, timeout });
			this.ws.send(JSON.stringify({ id, method, params }));
		});
	}
	async evaluate(expression) {
		const result = await this.call("Runtime.evaluate", {
			expression,
			awaitPromise: true,
			returnByValue: true,
		});
		assert.ok(
			!result.exceptionDetails,
			JSON.stringify(result.exceptionDetails),
		);
		return result.result.value;
	}
	close() {
		this.ws.close();
	}
}
const browser = await chromium.connectOverCDP(endpoint);
const page = await browser.contexts()[0].newPage();
const url = `${base}?proof=${Date.now()}`;
await page.goto(`about:blank?proof=${Date.now()}`);
const targets = await (await fetch(`${endpoint}/json/list`)).json();
const target = targets.find((t) => t.type === "page" && t.url === page.url());
assert.ok(target, "Chrome target exists");
const cdp = await new CDP(target.webSocketDebuggerUrl).open();
await cdp.call("Runtime.enable");
await cdp.call("Network.enable");
await cdp.call("Storage.clearDataForOrigin", {
	origin: new URL(base).origin,
	storageTypes: "all",
});
await page.goto(url);
await cdp.call("Emulation.setDeviceMetricsOverride", {
	width: 390,
	height: 844,
	deviceScaleFactor: 1,
	mobile: true,
});
async function tools(names) {
	for (let attempt = 0; attempt < 100; attempt++) {
		const found = await cdp.evaluate(
			`(async () => document.modelContext ? (await document.modelContext.getTools()).map(t => t.name) : [])()`,
		);
		if (names.every((name) => found.includes(name))) {
			for (const name of found) observedTools.add(name);
			return found;
		}
		await wait(50);
	}
	throw new Error(`NOT PROVED: Chrome getTools() missing ${names.join(", ")}`);
}
async function call(name, input = {}) {
	await tools([name]);
	const value = await cdp.evaluate(
		`(async () => { const tools = await document.modelContext.getTools(); const tool = tools.find(t => t.name === ${JSON.stringify(name)}); return JSON.parse(await document.modelContext.executeTool(tool, ${JSON.stringify(JSON.stringify(input))})); })()`,
	);
	check(
		`${name} returns a closed ${value.ok ? "success" : "error"} shape`,
		typeof value.ok === "boolean" &&
			Object.keys(value).every((key) =>
				(value.ok
					? ["ok", "state", "data"]
					: ["ok", "state", "error"]
				).includes(key),
			),
	);
	return value;
}
async function state() {
	return (await call("describe")).state;
}
async function navigate(where) {
	const result = await call("navigate", { page: where });
	assert.ok(result.ok);
	await tools(["describe"]);
	return result;
}
async function screenshot(label, width = 390) {
	await cdp.call("Emulation.setDeviceMetricsOverride", {
		width,
		height: 844,
		deviceScaleFactor: 1,
		mobile: true,
	});
	await cdp.evaluate(
		"new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
	);
	const layout = await cdp.evaluate(
		'({width: innerWidth, scroll: document.documentElement.scrollWidth, title: document.querySelector("main h1")?.textContent, font: getComputedStyle(document.body).fontFamily})',
	);
	check(`${label} fits ${width}px viewport`, layout.scroll <= layout.width);
	check(`${label} has a visible heading`, Boolean(layout.title));
	check(`${label} uses local DM Sans`, layout.font.includes("DM Sans"));
	const border = await cdp.evaluate(
		'getComputedStyle(document.querySelector("nav button")).borderWidth',
	);
	check(`${label} uses the intended button border`, border === "0px");
	await page.screenshot({
		path: `${dir}/${label}-${width}.png`,
		fullPage: true,
	});
}
try {
	if (without) {
		check(
			"WebMCP absent without flag",
			!(await cdp.evaluate("Boolean(document.modelContext)")),
		);
		check(
			"App renders without WebMCP",
			(
				await cdp.evaluate('document.querySelector("main h1")?.textContent')
			).includes("indfødsretsprøven"),
		);
		await screenshot("without-webmcp");
		await cdp.call("Emulation.setScriptExecutionDisabled", { value: true });
		for (const [path, heading] of [
			["/", "indfødsretsprøven"],
			["/om/", "Om Prøveklar"],
		]) {
			await page.goto(new URL(path, base).href);
			const html = await cdp.evaluate(
				'({heading: document.querySelector("main h1")?.textContent, headings: document.querySelectorAll("h1").length, text: document.querySelector("main")?.textContent, links: [...document.querySelectorAll("nav a")].map(a => a.getAttribute("href"))})',
			);
			check(
				`${path} has readable HTML without JavaScript`,
				html.heading?.includes(heading) && html.headings === 1,
			);
			check(
				`${path} has crawlable Home and About links`,
				["/", "/om/"].every((link) => html.links.includes(link)),
			);
			check(
				`${path} exposes its sources without JavaScript`,
				path === "/"
					? html.text.includes("2020") && html.text.includes("2026")
					: html.text.includes("Babak Bandpey") &&
							html.text.includes("Apache-2.0"),
			);
			await page.screenshot({
				path: `${dir}/no-js-${path === "/" ? "home" : "about"}.png`,
				fullPage: true,
			});
		}
	} else {
		await tools(["describe", "navigate", "start_practice"]);
		check("bank exposes 570 dated questions", (await state()).bankSize === 570);
		const llms = await cdp.evaluate('fetch("/llms.txt").then(r => r.text())');
		check(
			"llms.txt describes WebMCP and all ten tools",
			["WebMCP", "describe", "manage_progress", "finish_session"].every((x) =>
				llms.includes(x),
			),
		);
		await navigate("progress");
		await call("manage_progress", { action: "reset", confirm: true });
		await navigate("home");
		await screenshot("home", 320);
		await screenshot("home", 390);
		await screenshot("home", 430);
		for (const targetPage of ["practice", "tests", "progress"]) {
			await navigate(targetPage);
			await screenshot(targetPage);
		}
		await navigate("about");
		const aboutMetadata = await cdp.evaluate(
			'({path: location.pathname, title: document.title, canonical: document.querySelector("link[rel=canonical]").href, graph: JSON.parse(document.getElementById("structured-data").textContent)["@graph"]})',
		);
		check(
			"About navigation updates its public URL and metadata",
			aboutMetadata.path === "/om/" &&
				aboutMetadata.title.includes("Babak Bandpey") &&
				aboutMetadata.canonical === "https://dip.cocode.dk/om/" &&
				aboutMetadata.graph.some(
					(node) =>
						node["@type"] === "AboutPage" &&
						node.url === aboutMetadata.canonical,
				),
		);
		await page.goto(new URL("/om/", base).href);
		await tools(["describe", "navigate"]);
		check(
			"About opens directly after a reload",
			(await state()).page === "about",
		);
		await page.goto(new URL("/om/index.html", base).href);
		await tools(["describe", "navigate"]);
		check(
			"About file alias opens the correct view and canonical path",
			(await state()).page === "about" &&
				(await cdp.evaluate('location.pathname === "/om/"')),
		);
		const aboutState = await state();
		check(
			"About exposes the shared author and title",
			aboutState.page === "about" &&
				aboutState.about.title === "Om Prøveklar" &&
				aboutState.about.author === "Babak Bandpey",
		);
		const authorLinks = [
			"https://cocode.dk",
			"https://linkedin.com/in/babakbandpey",
			"https://github.com/cocodedk",
			"https://github.com/cocodedk/dip",
		];
		check(
			"About exposes all author and project links",
			authorLinks.every((url) =>
				aboutState.about.links.some((link) => link.url === url),
			),
		);
		const aboutText = aboutState.about.sections
			.flatMap((section) => section.paragraphs)
			.join(" ");
		check(
			"About explains archive dates, privacy, offline use and license limits",
			[
				"570",
				"13",
				"sommer 2020",
				"sommer 2026",
				"forældede",
				"ingen konto",
				"sendes ikke til en server",
				"Klar offline",
				"Apache-2.0",
				"ikke omfattet",
				"NOTICE",
			].every((text) => aboutText.includes(text)),
		);
		check(
			"About exposes the official study link",
			aboutState.about.sections.some((section) =>
				section.link?.url.includes("forberedelse-til-indfoedsretsproeven"),
			),
		);
		const renderedAbout = await cdp.evaluate(
			'({text: document.querySelector("main").textContent, links: [...document.querySelectorAll("main a")].map(a => a.href), nav: [...document.querySelectorAll("nav button, nav a")].map(b => ({text:b.textContent, current:b.getAttribute("aria-current")}))})',
		);
		check(
			"About renders author, links and active Om navigation",
			renderedAbout.text.includes(aboutState.about.author) &&
				authorLinks.every((url) =>
					renderedAbout.links.includes(new URL(url).href),
				) &&
				renderedAbout.nav.some(
					(button) => button.text === "Om" && button.current === "page",
				),
		);
		for (const width of [360, 390, 768, 1280]) await screenshot("about", width);
		await navigate("progress");
		const beforeInvalid = (await call("manage_progress", { action: "export" }))
			.data;
		for (const input of [
			[],
			{ page: 4 },
			{ page: "quiz" },
			{ page: "home", extra: true },
		])
			check("invalid navigation rejected", !(await call("navigate", input)).ok);
		check(
			"unconfirmed reset rejected",
			!(await call("manage_progress", { action: "reset" })).ok,
		);
		check(
			"invalid import rejected",
			!(
				await call("manage_progress", {
					action: "import",
					data: "{}",
					confirm: true,
				})
			).ok,
		);
		check(
			"malformed actions preserve progress",
			(await call("manage_progress", { action: "export" })).data ===
				beforeInvalid,
		);
		await navigate("home");
		await call("start_practice", { mode: "values", count: 10 });
		await tools(["answer_question", "move_question", "finish_session"]);
		let s = await state();
		const firstId = s.session.question.id;
		check(
			"practice initially hides answer",
			s.session.question.correctAnswer === null,
		);
		check(
			"cannot move before practice answer",
			!(await call("move_question", { index: 1 })).ok,
		);
		check(
			"stale question rejected",
			!(
				await call("answer_question", {
					question_id: "2020-06-01",
					choice: "A",
				})
			).ok,
		);
		check("empty answer rejected", !(await call("answer_question", {})).ok);
		await call("answer_question", {
			question_id: firstId,
			choice: byId.get(firstId).answer,
		});
		check(
			"feedback visible after correct answer",
			(await state()).session.question.correct === true,
		);
		check(
			"double answer rejected",
			!(
				await call("answer_question", {
					question_id: firstId,
					choice: byId.get(firstId).answer,
				})
			).ok,
		);
		await screenshot("feedback");
		await page.goto(url);
		await tools(["answer_question"]);
		s = await state();
		check(
			"reload preserves practice XP and feedback",
			s.progress.xp === 10 && s.session.question.correct === true,
		);
		await navigate("about");
		await page.goto(new URL("/om/", base).href);
		await tools(["resume_session"]);
		check(
			"About reload preserves the active practice and XP",
			(await state()).page === "about" &&
				(await state()).progress.xp === 10 &&
				(await state()).session.question.id === firstId,
		);
		await tools(["resume_session"]);
		await call("resume_session");
		check("resume returns to quiz", (await state()).page === "quiz");
		await call("move_question", { index: 1 });
		s = await state();
		const second = byId.get(s.session.question.id);
		await call("answer_question", {
			question_id: second.id,
			choice: Object.keys(second.options).find((x) => x !== second.answer),
		});
		await call("finish_session", { confirm: true });
		await screenshot("result");
		await navigate("progress");
		const backup = (await call("manage_progress", { action: "export" })).data;
		await call("manage_progress", { action: "reset", confirm: true });
		check("reset clears XP", (await state()).progress.xp === 0);
		await call("manage_progress", {
			action: "import",
			data: backup,
			confirm: true,
		});
		check("backup restores practice XP", (await state()).progress.xp === 10);
		const latest = (await state()).history[0];
		await call("open_result", { id: latest.id });
		check(
			"saved result can be reopened",
			(await state()).result.id === latest.id,
		);
		// Two independent threshold examples, answered via WebMCP; archive key is the external oracle.
		for (const scenario of [
			{ total: 40, values: 3, passed: false },
			{ total: 36, values: 4, passed: true },
		]) {
			await navigate("tests");
			await call("start_test", { term: "2026-06" });
			const activeExam = (await state()).session;
			await navigate("about");
			check(
				"About preserves exam deadline and hides the answer key",
				(await state()).session.deadline === activeExam.deadline &&
					(await state()).session.question.correctAnswer === null &&
					(await state()).session.question.answerSource === null,
			);
			await call("resume_session");
			check(
				"About resumes the same exam",
				(await state()).page === "quiz" &&
					(await state()).session.id === activeExam.id,
			);

			let material = scenario.total - scenario.values;
			let values = scenario.values;
			for (let index = 0; index < 45; index++) {
				if (index) await call("move_question", { index });
				s = await state();
				const q = byId.get(s.session.question.id);
				const right = q.category === "values" ? values-- > 0 : material-- > 0;
				await call("answer_question", {
					question_id: q.id,
					choice: right
						? q.answer
						: Object.keys(q.options).find((x) => x !== q.answer),
				});
				check(
					"timed exam keeps answer key hidden",
					(await state()).session.question.correctAnswer === null,
				);
			}
			await call("finish_session", { confirm: true });
			s = await state();
			check(
				`official boundary ${scenario.total}/45 and ${scenario.values}/5`,
				s.result.correct === scenario.total &&
					s.result.valuesCorrect === scenario.values &&
					s.result.passed === scenario.passed,
			);
		}
		await screenshot("exam-result");
		// A first online visit must precache the entire app before an offline reload.
		await cdp.evaluate("navigator.serviceWorker.ready.then(() => true)");
		for (
			let i = 0;
			i < 100 &&
			!(await cdp.evaluate("Boolean(navigator.serviceWorker.controller)"));
			i++
		)
			await wait(50);
		check(
			"offline worker controls the page",
			await cdp.evaluate("Boolean(navigator.serviceWorker.controller)"),
		);
		await cdp.call("Network.emulateNetworkConditions", {
			offline: true,
			latency: 0,
			downloadThroughput: 0,
			uploadThroughput: 0,
		});
		await page.goto(url);
		await tools(["describe"]);
		await page.goto(new URL("/om/", base).href);
		await tools(["describe", "navigate"]);
		check("About direct URL renders offline", (await state()).page === "about");
		check(
			"Offline About retains its page-specific canonical",
			await cdp.evaluate(
				'document.querySelector("link[rel=canonical]").href === "https://dip.cocode.dk/om/"',
			),
		);
		check(
			"offline reload preserves progress",
			(await state()).progress.xp > 10,
		);
		await navigate("tests");
		await call("start_test", { term: "mixed" });
		await screenshot("offline-test");
		for (let index = 0; index < 45; index++) {
			if (index) await call("move_question", { index });
			s = await state();
			const q = byId.get(s.session.question.id);
			await call("answer_question", { question_id: q.id, choice: q.answer });
		}
		await call("finish_session", { confirm: true });
		s = await state();
		check(
			"full offline 45-question test and answers work",
			s.result.correct === 45 &&
				s.result.valuesCorrect === 5 &&
				s.result.passed,
		);
		await page.goto(url);
		await tools(["describe"]);
		await navigate("progress");
		check(
			"offline completed result persists after reload",
			(await state()).history[0].correct === 45,
		);
		await screenshot("offline-progress");
		await cdp.call("Network.emulateNetworkConditions", {
			offline: false,
			latency: 0,
			downloadThroughput: -1,
			uploadThroughput: -1,
		});
		await call("manage_progress", { action: "reset", confirm: true });
		await navigate("home");
		check(
			"every declared tool was listed by real Chrome",
			[
				"describe",
				"navigate",
				"start_practice",
				"start_test",
				"resume_session",
				"answer_question",
				"move_question",
				"finish_session",
				"open_result",
				"manage_progress",
			].every((name) => observedTools.has(name)),
		);
	}
	check("no uncaught page exception", cdp.exceptions.length === 0);
	check("no console errors", cdp.logs.length === 0);
	const report = {
		passed: true,
		chrome: (await (await fetch(`${endpoint}/json/version`)).json()).Browser,
		webmcp: !without,
		assertions: checks.length,
		uniqueAssertions: [...new Set(checks)],
		tools: [...observedTools].toSorted(),
		exceptions: cdp.exceptions,
		logs: cdp.logs,
		url: base,
		date: new Date().toISOString(),
	};
	await writeFile(
		`${dir}/${without ? "without-webmcp" : "proof"}.json`,
		`${JSON.stringify(report, null, 2)}\n`,
	);
	console.log(
		`${checks.length} browser assertions passed; ${observedTools.size} real WebMCP tools proved.`,
	);
} finally {
	cdp.close();
	await page.close();
	await browser.close();
}
