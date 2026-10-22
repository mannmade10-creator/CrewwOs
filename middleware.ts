import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ADMIN_USER_ID = "user_3KssQdrEnCwzR428Q5nmtYKYqHF";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/demo", "/demo/(.*)",
  "/pitch", "/pitch/(.*)",
  "/pricing", "/pricing/(.*)",
  "/sign-in(.*)", "/sign-up(.*)",
  "/api/brevo(.*)",
  "/api/billing/webhook",
  "/api/webhooks/clerk",
  "/api/webhooks/retell",
  "/api/webhooks/resend-inbound",
  "/api/cron(.*)",
  "/api/leads/inbound",
  "/api/print/send-mailer",
  "/api/artist/fan-lead",
  "/scan/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  if (isAdminRoute(req)) {
    if (userId !== ADMIN_USER_ID) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
  if (!isPublicRoute(req) && !userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};