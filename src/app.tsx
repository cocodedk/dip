import { useEffect, useState, useSyncExternalStore } from "react";
import * as stylex from "@stylexjs/stylex";
import { Controller, type Action } from "./controller";
import { registerPage } from "./webmcp";
import { s } from "./styles";
import { Nav } from "./components";
import { Home, Practice, Tests, ResultPage } from "./pages";
import { Quiz } from "./quiz";
import { AboutPage } from "./about";
import { ProgressPage } from "./progress";
import { metadataFor, structuredData, pageForPath } from "./seo";

export function App({ controller }: { controller: Controller }) {
	const view = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
		controller.getSnapshot,
	);
	const [error, setError] = useState<string | null>(null);
	const [offlineReady, setOfflineReady] = useState(false);
	const [online, setOnline] = useState(
		typeof window === "undefined" || navigator.onLine,
	);
	const act = (action: Action) => setError(action.ok ? null : action.error);
	useEffect(
		() => registerPage(controller, view.page),
		[view.page, view.canResume, view.history.length],
	);
	useEffect(() => {
		const page = view.page === "about" ? "about" : "home";
		const metadata = metadataFor(page);
		const image = document
			.querySelector('meta[property="og:image"]')
			?.getAttribute("content");
		const graph = document.getElementById("structured-data");
		if (graph && image)
			graph.textContent = JSON.stringify(structuredData(page, image));
		document.title =
			view.page === "home" || view.page === "about"
				? metadata.title
				: `${view.title} · Prøveklar`;
		document
			.querySelector('meta[name="description"]')
			?.setAttribute("content", metadata.description);
		document
			.querySelector('link[rel="canonical"]')
			?.setAttribute("href", metadata.url);
		for (const key of ["title", "description", "url"] as const) {
			document
				.querySelector(`meta[property="og:${key}"]`)
				?.setAttribute("content", metadata[key]);
			if (key !== "url")
				document
					.querySelector(`meta[name="twitter:${key}"]`)
					?.setAttribute("content", metadata[key]);
		}
		if (window.location.pathname !== metadata.path) {
			const alias =
				window.location.pathname === "/index.html" ||
				(page === "about" && pageForPath(window.location.pathname) === "about");
			window.history[alias ? "replaceState" : "pushState"](
				null,
				"",
				metadata.path + window.location.search,
			);
		}
		setError(null);
		window.scrollTo({ top: 0, behavior: "instant" });
		document.querySelector("main h1")?.setAttribute("tabindex", "-1");
		(document.querySelector("main h1") as HTMLElement | null)?.focus({
			preventScroll: true,
		});
	}, [view.page, view.session?.index]);
	useEffect(() => {
		const onBack = () =>
			controller.navigate(pageForPath(window.location.pathname));
		window.addEventListener("popstate", onBack);
		return () => window.removeEventListener("popstate", onBack);
	}, [controller]);
	useEffect(() => {
		const onOnline = () => setOnline(true);
		const onOffline = () => setOnline(false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		const timer = window.setInterval(() => controller.expire(), 1000);
		if (import.meta.env.PROD && "serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/sw.js", { updateViaCache: "none" })
				.then(() => navigator.serviceWorker.ready)
				.then(() => setOfflineReady(true))
				.catch(() => setOfflineReady(false));
		}
		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
			window.clearInterval(timer);
		};
	}, []);
	const props = { view, controller, act };
	return (
		<div {...stylex.props(s.app)}>
			<header {...stylex.props(s.header)}>
				<div {...stylex.props(s.brand)}>
					<img
						{...stylex.props(s.flag)}
						src="/icon.svg"
						alt=""
						width="36"
						height="36"
					/>
					<div>
						<p {...stylex.props(s.brandName)}>Prøveklar</p>
						<span {...stylex.props(s.small, s.muted)}>Indfødsretsprøven</span>
					</div>
				</div>
				<span {...stylex.props(s.badge)} role="status">
					{typeof window === "undefined"
						? "Gratis øvelse"
						: offlineReady
							? online
								? "✓ Klar offline"
								: "✓ Offline"
							: import.meta.env.DEV
								? "Udvikling"
								: online
									? "Henter offline…"
									: "Offline"}
				</span>
			</header>
			<main id="main">
				{view.storageError && (
					<div role="alert" {...stylex.props(s.error)}>
						{view.storageError}
					</div>
				)}
				{error && (
					<div role="alert" {...stylex.props(s.error)}>
						{error}
					</div>
				)}
				{view.page === "home" && <Home {...props} />}{" "}
				{view.page === "practice" && <Practice {...props} />}{" "}
				{view.page === "tests" && <Tests {...props} />}{" "}
				{view.page === "quiz" && <Quiz {...props} />}{" "}
				{view.page === "result" && <ResultPage {...props} />}{" "}
				{view.page === "progress" && <ProgressPage {...props} />}
				{view.page === "about" && <AboutPage {...props} />}
			</main>
			<Nav
				page={view.page}
				navigate={(page) => act(controller.navigate(page))}
			/>
			<noscript>
				<p>
					Aktivér JavaScript for at svare på spørgsmål og gemme fremskridt; du
					kan stadig læse om appen.
				</p>
			</noscript>
		</div>
	);
}
