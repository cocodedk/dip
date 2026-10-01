import { renderToString } from "react-dom/server";
import { App } from "./app";
import { Controller } from "./controller";

export function render(page: "home" | "about") {
	const controller = new Controller({ getItem: () => null, setItem: () => {} });
	controller.navigate(page);
	return renderToString(<App controller={controller} />);
}
