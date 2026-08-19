import { Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";

export type WebhookProcessingResult = "processed" | "duplicate";

async function claimEvent(event: Stripe.Event) {
  try {
    await prisma.stripeWebhookEvent.create({
      data: { stripeEventId: event.id, eventType: event.type },
    });
    return true;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
  const retried = await prisma.stripeWebhookEvent.updateMany({
    where: {
      stripeEventId: event.id,
      OR: [{ status: "FAILED" }, { status: "PROCESSING", updatedAt: { lt: staleBefore } }],
    },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      errorMessage: null,
      processedAt: null,
    },
  });
  return retried.count === 1;
}

export async function processStripeWebhookEvent(
  event: Stripe.Event,
  handler: (event: Stripe.Event) => Promise<void>,
): Promise<WebhookProcessingResult> {
  if (!(await claimEvent(event))) return "duplicate";

  try {
    await handler(event);
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: { status: "PROCESSED", processedAt: new Date(), errorMessage: null },
    });
    return "processed";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: { status: "FAILED", errorMessage: message.slice(0, 2000) },
    });
    throw error;
  }
}
