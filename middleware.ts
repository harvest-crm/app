import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/suspended(.*)",
  "/pending(.*)",
  "/rejected(.*)",
  "/api/webhooks(.*)",
  "/api/lead-capture(.*)",
  "/api/cron(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // /admin/* — enforce sign-in at middleware level.
  // The actual platform-admin check happens in app/admin/layout.tsx (needs Prisma).
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const { userId } = await auth();
    if (!userId) {
      const signIn = new URL("/sign-in", request.url);
      signIn.searchParams.set("redirect_url", request.nextUrl.pathname);
      return NextResponse.redirect(signIn);
    }
    return NextResponse.next();
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
