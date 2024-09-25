/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";

export default defineConfig({
  test: {
    includeSource: ["src/**/*.{js,ts}"],
    env: loadEnv("", process.cwd(), ""),
  },
});
