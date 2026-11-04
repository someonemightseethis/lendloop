import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** Globals n8n injects into Code nodes, plus the shared signature module prepended by scripts/n8n-code.mjs. */
const n8nCodeGlobals = Object.fromEntries(
  ["$", "$env", "$input", "$json", "$getWorkflowStaticData", "lendloopSign", "lendloopVerify", "REPLAY_WINDOW_SECONDS"].map((name) => [
    name,
    "readonly",
  ]),
);

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "convex/_generated/**", "next-env.d.ts", ".local-logs/**"],
  },
  {
    // n8n Code node bodies run inside an async function, with CommonJS require.
    files: ["n8n/code/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      parserOptions: { ecmaFeatures: { globalReturn: true } },
      globals: n8nCodeGlobals,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "error",
    },
  },
  {
    files: ["n8n/code/signature.js"],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
];

export default config;
