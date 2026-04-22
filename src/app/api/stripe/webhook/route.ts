import { getPrismaClient } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/connect";

function getWebhookSecret() {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Missing required env var: STRIPE_CONNECT_WEBHOOK_SECRET");
  }

  return secret;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, getWebhookSecret());

    if (event.type === "account.updated") {
      const account = event.data.object;
      const prisma = getPrismaClient();

      await prisma.stripeAccount.updateMany({
        where: { stripeAccountId: account.id },
        data: {
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        },
      });
    }

    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    return Response.json({ error: message }, { status: 400 });
  }
}
