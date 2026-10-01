import { useEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import * as stylex from "@stylexjs/stylex";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "./base.css";
import { Controller, type Action } from "./controller";
import { registerPage } from "./webmcp";
import { s } from "./styles";
import { Nav } from "./components";
import { Home, Practice, Tests, ResultPage } from "./pages";
import { Quiz } from "./quiz";
import { AboutPage } from "./about";
import { ProgressPage } from "./progress";

let storage: Storage | null = null;
try {
	storage = window.localStorage;
} catch {
	/* Private browsers can refuse access. */
}
const controller = new Controller(storage);
function App() {
	const view = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
	);
	const [error, setError] = useState<string | null>(null);
	const [offlineReady, setOfflineReady] = useState(false);
	const [online, setOnline] = useState(navigator.onLine);
	const act = (action: Action) => setError(action.ok ? null : action.error);
	useEffect(
		() => registerPage(controller, view.page),
		[view.page, view.canResume, view.history.length],
	);
	useEffect(() => {
		document.title =
			view.page === "home"
				? "Indfødsretsprøven: øv med tidligere prøver | Prøveklar"
				: `${view.title} · Prøveklar`;
		setError(null);
		window.scrollTo({ top: 0, behavior: "instant" });
		document.querySelector("main h1")?.setAttribute("tabindex", "-1");
		(document.querySelector("main h1") as HTMLElement | null)?.focus({
			preventScroll: true,
		});
	}, [view.page, view.session?.index]);
	useEffect(() => {
		const onOnline = () => setOnline(true);
		const onOffline = () => setOnline(false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		const timer = window.setInterval(() => controller.expire(), 1000);
		if (import.meta.env.PROD && "serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/sw.js")
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
					<img {...stylex.props(s.flag)} src="/icon.svg" alt="" />
					<div>
						<p {...stylex.props(s.brandName)}>Prøveklar</p>
						<span {...stylex.props(s.small, s.muted)}>Indfødsretsprøven</span>
					</div>
				</div>
				<span {...stylex.props(s.badge)} role="status">
					{offlineReady
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
		</div>
	);
}
createRoot(document.getElementById("root")!).render(<App />);
