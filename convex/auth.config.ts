import type { AuthConfig } from "convex/server";

/** Convex validates Clerk-issued JWTs (template/integration "convex") against this issuer. */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
