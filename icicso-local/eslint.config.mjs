import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".turbo/**",
      "engines/**/.pytest_cache/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["apps/*/src/**/*.ts", "packages/*/src/**/*.ts"],
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        projectService: false,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...config.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "no-constant-condition": "off",
      "no-var": "off",
    },
  })),
  {
    files: ["apps/desktop-emulator/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "off",
    },
  },
];
