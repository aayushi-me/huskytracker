import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Ignore build output
  {
    ignores: ["dist", "node_modules"],
  },

  {
    files: ["**/*.{ts,tsx}"],

    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],

    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },

    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },

    rules: {
      /* ======================================================
         CI-SAFE RULE SET (IMPORTANT)
         ====================================================== */

      // 🔥 Allow `any` (API + backend integration code)
      "@typescript-eslint/no-explicit-any": "off",

      // 🔥 Allow unused vars but keep signal as warnings
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // 🔥 Allow empty interfaces / placeholder DTOs
      "@typescript-eslint/no-empty-object-type": "off",

      // 🔥 Allow @ts-ignore during development
      "@typescript-eslint/ban-ts-comment": "off",

      // 🔥 Hooks dependency checking as warning (not CI blocker)
      "react-hooks/exhaustive-deps": "warn",

      // React hooks correctness
      ...reactHooks.configs.recommended.rules,

      // Fast refresh safety (warning only)
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  }
);
