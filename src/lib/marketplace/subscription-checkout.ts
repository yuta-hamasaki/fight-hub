import { prisma } from "@/lib/prisma";
import { getStripeClient, getAppBaseUrl } from "@/lib/stripe";
import { isStripeOnboardingComplete } from "@/lib/stripe/connect";
import { toMinor } from "@/lib/billing/money";
import { platformFeePercent } from "@/lib/billing/fees";
import { userLock } from "./schedule";
export async function beginSubscription(
  userId: string,
  planId: string,
  locale: string,
) {
  const plan = await prisma.subscriptionPlan.findFirst({
    where: {
      id: planId,
      isActive: true,
      trainerProfile: { isPublished: true },
    },
    include: {
      trainerProfile: {
        include: { user: { include: { stripeAccount: true } } },
      },
    },
  });
  const account = plan?.trainerProfile.user.stripeAccount;
  if (!plan || !account || !isStripeOnboardingComplete(account))
    throw new Error("Unavailable");
  const stripe = getStripeClient(),
    base = getAppBaseUrl(),
    billing = `${base}/${locale}/dashboard/workspace?tab=billing`;
  // Persist a checkout generation before contacting Stripe. Ambiguous failures retry the same key.
  const reservation = await prisma.$transaction(async (db) => {
    await userLock(db, userId);
    if (
      await db.subscriptionPurchase.findFirst({
        where: {
          userId,
          subscriptionPlanId: planId,
          status: { in: ["ACTIVE", "PAST_DUE"] },
        },
      })
    )
      return null;
    const current = await db.subscriptionCheckout.findUnique({
      where: { userId_planId: { userId, planId } },
    });
    if (current) return current;
    return db.subscriptionCheckout.create({
      data: { userId, planId, expiresAt: new Date(Date.now() + 31 * 60000) },
    });
  });
  if (!reservation) return billing;
  if (reservation.sessionId) {
    const old = await stripe.checkout.sessions.retrieve(reservation.sessionId);
    if (old.status === "complete") {
      const purchase = await prisma.subscriptionPurchase.findFirst({
        where: { stripeCheckoutSessionId: old.id },
      });
      if (!purchase || ["ACTIVE", "PAST_DUE"].includes(purchase.status))
        return billing;
      await prisma.subscriptionCheckout.deleteMany({
        where: { userId, planId, sessionId: old.id },
      });
      return beginSubscription(userId, planId, locale);
    }
    if (old.status === "open" && old.url) return old.url;
    await prisma.subscriptionCheckout.deleteMany({
      where: { userId, planId, sessionId: old.id },
    });
    return beginSubscription(userId, planId, locale);
  }
  if (reservation.expiresAt <= new Date()) {
    // Reconcile a checkout created successfully before a network failure; never blindly create another.
    const sessions = stripe.checkout.sessions.list({
      created: {
        gte: Math.floor(reservation.expiresAt.getTime() / 1000) - 32 * 60,
        lte: Math.floor(reservation.expiresAt.getTime() / 1000),
      },
      limit: 100,
    });
    for await (const session of sessions) {
      if (
        session.metadata?.dbUserId === userId &&
        session.metadata?.subscriptionPlanId === planId
      ) {
        await prisma.subscriptionCheckout.updateMany({
          where: { userId, planId, expiresAt: reservation.expiresAt },
          data: { sessionId: session.id },
        });
        return beginSubscription(userId, planId, locale);
      }
    }
    await prisma.subscriptionCheckout.deleteMany({
      where: {
        userId,
        planId,
        expiresAt: reservation.expiresAt,
        sessionId: null,
      },
    });
    return beginSubscription(userId, planId, locale);
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  let customer = user.stripeCustomerId;
  if (!customer) {
    const legacy = await prisma.subscriptionPurchase.findFirst({
      where: { userId, stripeCustomerId: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    customer =
      legacy?.stripeCustomerId ??
      (
        await stripe.customers.create(
          {
            metadata: { dbUserId: userId },
            ...(user.email ? { email: user.email } : {}),
          },
          { idempotencyKey: `customer:${userId}` },
        )
      ).id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer },
    });
  }
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer,
      payment_method_types: ["card"],
      expires_at: Math.floor(reservation.expiresAt.getTime() / 1000),
      success_url: `${billing}&saved=1`,
      cancel_url: `${base}/${locale}/trainers/${plan.trainerProfileId}`,
      metadata: {
        dbUserId: userId,
        subscriptionPlanId: plan.id,
        trainerProfileId: plan.trainerProfileId,
      },
      subscription_data: {
        transfer_data: { destination: account.stripeAccountId },
        application_fee_percent: platformFeePercent(),
        metadata: {
          dbUserId: userId,
          subscriptionPlanId: plan.id,
          trainerProfileId: plan.trainerProfileId,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: plan.currency.toLowerCase(),
            unit_amount: toMinor(Number(plan.priceMonthly), plan.currency),
            recurring: { interval: "month" },
            product_data: { name: plan.nameEn },
          },
        },
      ],
    },
    {
      idempotencyKey: `subscription:${userId}:${planId}:${Math.floor(reservation.expiresAt.getTime() / 1000)}`,
    },
  );
  await prisma.subscriptionCheckout.updateMany({
    where: { userId, planId, expiresAt: reservation.expiresAt },
    data: { sessionId: session.id },
  });
  return session.url || billing;
}
