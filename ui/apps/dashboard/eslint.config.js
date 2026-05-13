/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";

export default [
  {
    ignores: [
      "package-lock.json",
      "pnpm-lock.yaml",
      "public",
      "dist",
      "build",
      "node_modules",
      "playwright-report",
      "test-results",
      "vite.config.ts",
      "scripts/*.js",
      "*.config.js",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // this setting is required to use rules that require type information
        project: true,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin,
      "react-refresh": reactRefreshPlugin,
    },
    rules: {
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
];
