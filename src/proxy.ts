import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/portal(.*)",
]);

const RESERVED_SEGMENTS = new Set([
  "events", "directory", "coupons", "blog", "videos", "profile",
  "admin", "portal", "auth", "api", "_next", "c",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  const { pathname, searchParams } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const orgSlug = segments[0];

  if (!orgSlug || RESERVED_SEGMENTS.has(orgSlug)) return;

  // Backward compat: redirect ?community=slug to path-based URL
  const legacyCommunity = searchParams.get("community");
  if (legacyCommunity) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("community");
    const rest = segments.slice(1).join("/");
    url.pathname = `/${orgSlug}/${legacyCommunity}${rest ? `/${rest}` : ""}`;
    return NextResponse.redirect(url, 301);
  }

  // Backward compat: redirect old /c/ URLs to new format
  if (segments[1] === "c" && segments[2]) {
    const communitySlug = segments[2];
    const rest = segments.slice(3).join("/");
    const url = request.nextUrl.clone();
    url.pathname = `/${orgSlug}/${communitySlug}${rest ? `/${rest}` : ""}`;
    return NextResponse.redirect(url, 301);
  }

  // Rewrite /orgSlug/communitySlug/... → /orgSlug/... when second segment is not reserved
  if (segments.length >= 2 && !RESERVED_SEGMENTS.has(segments[1])) {
    const communitySlug = segments[1];
    const rest = segments.slice(2).join("/");
    const url = request.nextUrl.clone();
    url.pathname = `/${orgSlug}${rest ? `/${rest}` : ""}`;
    url.searchParams.set("_community", communitySlug);
    return NextResponse.rewrite(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
