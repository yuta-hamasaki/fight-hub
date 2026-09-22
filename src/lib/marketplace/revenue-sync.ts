import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { fromMinor } from "@/lib/billing/money";
import {
  handleInvoicePaid,
  handleSubscriptionUpdated,
} from "@/lib/stripe/subscription-webhooks";
// Read Stripe only; this operation does not charge, refund, or notify customers.
export async function syncTrainerRevenue(trainerId: string) {
  const stripe = getStripeClient();
  const bookings = await prisma.booking.findMany({
    where: { trainerId, stripePaymentIntentId: { not: null } },
    include: { sessionOffering: true },
  });
  for (const b of bookings) {
    const payment = await stripe.paymentIntents.retrieve(
      b.stripePaymentIntentId!,
      { expand: ["latest_charge"] },
    );
    if (payment.status !== "succeeded") continue;
    const charge =
      typeof payment.latest_charge === "object" ? payment.latest_charge : null;
    const id = b.stripeCheckoutSessionId || payment.id,
      currency = payment.currency.toUpperCase();
    const data = {
      trainerId,
      clientId: b.clientId,
      kind: "session",
      description: b.sessionOffering.titleEn,
      amount: fromMinor(payment.amount_received, currency),
      refunded: fromMinor(charge?.amount_refunded ?? 0, currency),
      fee: fromMinor(payment.application_fee_amount ?? 0, currency),
      currency,
      paymentIntentId: payment.id,
      occurredAt: new Date(payment.created * 1000),
    };
    await prisma.paymentRecord.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
  const subscriptions = await prisma.subscriptionPurchase.findMany({
    where: {
      subscriptionPlan: { trainerProfile: { userId: trainerId } },
      stripeSubscriptionId: { not: null },
    },
  });
  for (const p of subscriptions) {
    const sub = await stripe.subscriptions.retrieve(p.stripeSubscriptionId!);
    await handleSubscriptionUpdated(sub);
    for await (const invoice of stripe.invoices.list({
      subscription: sub.id,
      status: "paid",
      limit: 100,
    }))
      await handleInvoicePaid(invoice);
  }
}
