import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "./base.css";
import { App } from "./app";
import { Controller } from "./controller";
import { pageForPath } from "./seo";

let storage: Storage | null = null;
try {
	storage = window.localStorage;
} catch {
	/* Private browsers can refuse access. */
}
const controller = new Controller(storage);
if (pageForPath(window.location.pathname) === "about")
	controller.navigate("about");
createRoot(document.getElementById("root")!).render(
	<App controller={controller} />,
);
