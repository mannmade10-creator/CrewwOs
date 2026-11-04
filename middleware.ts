import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/affiliates/track",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Capture affiliate ref on landing
  const ref = req.nextUrl.searchParams.get("ref");
  if (ref) {
    const res = NextResponse.next();
    res.cookies.set("aff_ref", ref, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });
    res.cookies.set("aff_product", "crewwos", {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });
    return res;
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
