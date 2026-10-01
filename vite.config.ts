import stylex from "@stylexjs/unplugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
	plugins:
		mode === "test" ? [] : [stylex.vite({ useCSSLayers: true }), react()],
	test: { include: ["src/**/*.test.ts"], environment: "node" },
}));
