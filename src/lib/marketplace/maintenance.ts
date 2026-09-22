import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import {
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
} from "@/lib/stripe/subscription-webhooks";
import { refundBooking } from "./bookings";
export async function reconcileExpiredHolds() {
  const holds = await prisma.booking.findMany({
    where: {
      status: "PENDING",
      holdExpiresAt: { lt: new Date(Date.now() - 60000) },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  for (const b of holds) {
    try {
      const stripe = getStripeClient();
      let session: Stripe.Checkout.Session | null = b.stripeCheckoutSessionId
        ? await stripe.checkout.sessions.retrieve(b.stripeCheckoutSessionId)
        : null;
      if (!session) {
        for await (const candidate of stripe.checkout.sessions.list({
          created: {
            gte: Math.floor(b.createdAt.getTime() / 1000) - 60,
            lte: Math.floor(b.holdExpiresAt!.getTime() / 1000) + 60,
          },
          limit: 100,
        })) {
          if (candidate.metadata?.bookingId === b.id) {
            session = candidate;
            break;
          }
        }
      }
      if (session) {
        await prisma.booking.update({
          where: { id: b.id },
          data: { stripeCheckoutSessionId: session.id },
        });
        if (session.status === "open")
          try {
            session = await stripe.checkout.sessions.expire(session.id);
          } catch {
            session = await stripe.checkout.sessions.retrieve(session.id);
          }
        if (session.payment_status === "paid")
          await handleCheckoutSessionCompleted(session);
        else if (session.status === "expired")
          await handleCheckoutSessionExpired(session);
      } else
        await prisma.booking.updateMany({
          where: { id: b.id, status: "PENDING", stripeCheckoutSessionId: null },
          data: {
            status: "CANCELED",
            canceledAt: new Date(),
            cancellationReason: "Checkout was not created",
          },
        });
    } catch (error) {
      console.error("Booking reconciliation failed", {
        bookingId: b.id,
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }
  const refunds = await prisma.booking.findMany({
    where: {
      status: "CANCELED",
      refundStatus: { in: ["FAILED", "PENDING"] },
      stripePaymentIntentId: { not: null },
    },
    take: 50,
  });
  for (const b of refunds) await refundBooking(b.id);
  return holds.length;
}
