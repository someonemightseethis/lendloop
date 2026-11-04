import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // convex-test runs functions in the same edge runtime Convex uses (WebCrypto, fetch).
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["tests/**/*.test.ts"],
  },
});
