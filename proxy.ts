import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/** Signed-in areas. Convex re-checks identity and roles on every call; this only gates navigation. */
const isProtected = createRouteMatcher(["/tools(.*)", "/listings(.*)", "/requests(.*)", "/incoming(.*)", "/admin(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtected(request)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
