import js from "@eslint/js";
import { globalIgnores } from "eslint/config";
import ts from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

const nodeGlobals = {
  __dirname: "readonly",
  __filename: "readonly",
  console: "readonly",
  module: "readonly",
  process: "readonly",
  require: "readonly",
};

const serviceWorkerGlobals = {
  URL: "readonly",
  URLSearchParams: "readonly",
  Response: "readonly",
  caches: "readonly",
  console: "readonly",
  fetch: "readonly",
  firebase: "readonly",
  importScripts: "readonly",
  self: "readonly",
};

export default ts.config(
  globalIgnores(["dist/**", "node_modules/**"]),
  {
    files: ["ecosystem.config.cjs", "scripts/**/*.{js,mjs,cjs}"],
    languageOptions: { globals: nodeGlobals },
  },
  {
    files: ["public/**/*.js"],
    languageOptions: { globals: serviceWorkerGlobals },
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  }
);
