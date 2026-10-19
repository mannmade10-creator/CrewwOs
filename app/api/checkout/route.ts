import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe, PRICE_IDS, PriceKey } from "@/lib/stripe";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;

  const body = await req.json();
  const { priceKey, mode }: { priceKey: PriceKey; mode?: "subscription" | "payment" } = body;

  if (!priceKey || !PRICE_IDS[priceKey]) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  // One-time payments for add-ons; subscriptions for main tiers
  const checkoutMode =
    mode ??
    (["starter", "pro", "enterprise"].includes(priceKey) ? "subscription" : "payment");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: checkoutMode,
      line_items: [{ price: PRICE_IDS[priceKey], quantity: 1 }],
      customer_email: email,
      metadata: { userId, priceKey },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
