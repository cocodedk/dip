import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const browser = await chromium.launch({
	headless: true,
	executablePath: process.env.CHROME_PATH,
});
try {
	const page = await browser.newPage({
		viewport: { width: 1200, height: 630 },
		deviceScaleFactor: 1,
	});
	await page.goto(new URL("./og-image.html", import.meta.url).href, {
		waitUntil: "networkidle",
	});
	await page.screenshot({
		path: fileURLToPath(new URL("../public/og.png", import.meta.url)),
	});
} finally {
	await browser.close();
}
