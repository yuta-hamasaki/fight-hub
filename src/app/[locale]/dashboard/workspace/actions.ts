"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";
import {
  safeUrl,
  localToUtc,
  validTimezone,
  canFinishBooking,
} from "@/lib/marketplace/rules";
import {
  trainerLock,
  userLock,
  scheduleData,
  slotAvailable,
} from "@/lib/marketplace/schedule";
import { cancelReservation } from "@/lib/marketplace/bookings";
import { notify, notifyBooking } from "@/lib/marketplace/notifications";
import { notificationService } from "@/lib/notifications/service";
import { getStripeClient, getAppBaseUrl } from "@/lib/stripe";
import { isStripeOnboardingComplete } from "@/lib/stripe/connect";
import { toMinor } from "@/lib/billing/money";
import { calculatePlatformFeeAmount } from "@/lib/billing/fees";

const text = (f: FormData, key: string, max = 4000) =>
  String(f.get(key) ?? "")
    .trim()
    .slice(0, max);
function integer(f: FormData, key: string, min: number, max: number) {
  const n = Number(f.get(key));
  if (!Number.isInteger(n) || n < min || n > max)
    throw new Error("Invalid number");
  return n;
}
export async function mutate(locale: Locale, f: FormData) {
  const user = await requireDbUser(locale);
  const op = text(f, "op", 40),
    id = text(f, "id", 100),
    clientId = text(f, "clientId", 100);
  const tab = text(f, "tab", 30);
  let destination = `/${locale}/dashboard/workspace${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`;
  const returnBooking = text(f, "returnBooking", 100);
  if (returnBooking)
    destination = `/${locale}/dashboard/bookings/${encodeURIComponent(returnBooking)}`;
  let externalUrl: string | null = null;
  try {
    const requireTrainer = () => {
      if (user.role !== "TRAINER") throw new Error("Not authorized");
    };
    const requireClient = () => {
      if (user.role !== "CLIENT") throw new Error("Not authorized");
    };
    const relatedClient = async () => {
      requireTrainer();
      const [booking, member] = await Promise.all([
        prisma.booking.findFirst({
          where: {
            trainerId: user.id,
            clientId,
            status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] },
          },
        }),
        prisma.subscriptionPurchase.findFirst({
          where: {
            userId: clientId,
            status: "ACTIVE",
            subscriptionPlan: { trainerProfile: { userId: user.id } },
          },
        }),
      ]);
      if (!booking && !member) throw new Error("Not authorized");
    };
    switch (op) {
      case "resumePayment": {
        requireClient();
        const b = await prisma.booking.findFirst({
          where: { id, clientId: user.id, status: "PENDING" },
        });
        if (!b?.stripeCheckoutSessionId)
          throw new Error("Payment is being reconciled");
        const session = await getStripeClient().checkout.sessions.retrieve(
          b.stripeCheckoutSessionId,
        );
        if (session.status === "open") externalUrl = session.url;
        break;
      }
      case "syncRevenue": {
        requireTrainer();
        const { syncTrainerRevenue } =
          await import("@/lib/marketplace/revenue-sync");
        await syncTrainerRevenue(user.id);
        destination = `/${locale}/dashboard/trainer/revenue`;
        break;
      }
      case "intake": {
        requireClient();
        const timezone = text(f, "timezone", 64);
        if (!validTimezone(timezone)) throw new Error("Invalid timezone");
        const data = {
          goals: text(f, "goals"),
          experience: text(f, "experience"),
          considerations: text(f, "considerations"),
          timezone,
        };
        await prisma.clientIntake.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...data },
          update: data,
        });
        await prisma.profile.updateMany({
          where: { userId: user.id },
          data: { timezone },
        });
        break;
      }
      case "notes": {
        await relatedClient();
        await prisma.coachingRecord.upsert({
          where: { trainerId_clientId: { trainerId: user.id, clientId } },
          create: {
            trainerId: user.id,
            clientId,
            privateNotes: text(f, "privateNotes"),
          },
          update: { privateNotes: text(f, "privateNotes") },
        });
        break;
      }
      case "assignment": {
        await relatedClient();
        const title = text(f, "title", 200),
          instructions = text(f, "instructions");
        if (!title || !instructions) throw new Error("Required");
        const date = text(f, "dueAt", 10);
        const dueAt = date ? new Date(`${date}T23:59:59Z`) : null;
        if (dueAt && !Number.isFinite(dueAt.getTime()))
          throw new Error("Invalid date");
        const task = await prisma.assignment.create({
          data: { trainerId: user.id, clientId, title, instructions, dueAt },
        });
        await notify(
          clientId,
          "新しい課題が届きました",
          "You have a new assignment",
          "/dashboard/workspace?tab=coaching",
          `assignment:${task.id}`,
        );
        break;
      }
      case "progress": {
        requireClient();
        await prisma.assignment.updateMany({
          where: { id, clientId: user.id },
          data: {
            progress: text(f, "progress"),
            completedAt: f.get("completed") ? new Date() : null,
          },
        });
        break;
      }
      case "favorite": {
        requireClient();
        const profile = await prisma.trainerProfile.findFirst({
          where: { id, isPublished: true },
        });
        if (!profile) throw new Error("Not found");
        if (f.get("remove"))
          await prisma.favorite.deleteMany({
            where: { userId: user.id, trainerProfileId: id },
          });
        else
          await prisma.favorite.upsert({
            where: {
              userId_trainerProfileId: {
                userId: user.id,
                trainerProfileId: id,
              },
            },
            create: { userId: user.id, trainerProfileId: id },
            update: {},
          });
        break;
      }
      case "message": {
        const body = text(f, "body");
        if (!body) throw new Error("Required");
        const trainerId =
          user.role === "TRAINER" ? user.id : text(f, "trainerId", 100);
        const recipientClient = user.role === "CLIENT" ? user.id : clientId;
        if (
          !trainerId ||
          !recipientClient ||
          !["CLIENT", "TRAINER"].includes(user.role)
        )
          throw new Error("Not authorized");
        if (user.role === "TRAINER") {
          const [prior, booking, member] = await Promise.all([
            prisma.message.findFirst({
              where: { trainerId, clientId: recipientClient },
            }),
            prisma.booking.findFirst({
              where: { trainerId, clientId: recipientClient },
            }),
            prisma.subscriptionPurchase.findFirst({
              where: {
                userId: recipientClient,
                subscriptionPlan: { trainerProfile: { userId: trainerId } },
              },
            }),
          ]);
          if (!prior && !booking && !member) throw new Error("Not authorized");
        } else if (
          !(await prisma.trainerProfile.findFirst({
            where: { userId: trainerId, isPublished: true },
          }))
        )
          throw new Error("Not found");
        const bookingId = text(f, "bookingId", 100) || null;
        if (
          bookingId &&
          !(await prisma.booking.findFirst({
            where: { id: bookingId, trainerId, clientId: recipientClient },
          }))
        )
          throw new Error("Not authorized");
        const recent = await prisma.message.count({
          where: {
            senderId: user.id,
            createdAt: { gt: new Date(Date.now() - 60000) },
          },
        });
        if (recent >= 10) throw new Error("Please wait before sending again");
        const msg = await prisma.message.create({
          data: {
            trainerId,
            clientId: recipientClient,
            senderId: user.id,
            bookingId,
            body,
          },
        });
        await notify(
          user.id === trainerId ? recipientClient : trainerId,
          "メッセージが届きました",
          "You have a new message",
          "/dashboard/workspace?tab=messages",
          `message:${msg.id}`,
        );
        break;
      }
      case "read":
        await prisma.appNotification.updateMany({
          where: { userId: user.id, readAt: null },
          data: { readAt: new Date() },
        });
        break;
      case "support": {
        const bookingId = text(f, "bookingId", 100) || null;
        if (
          bookingId &&
          !(await prisma.booking.findFirst({
            where: {
              id: bookingId,
              OR: [{ clientId: user.id }, { trainerId: user.id }],
            },
          }))
        )
          throw new Error("Not authorized");
        const subject = text(f, "subject", 200),
          body = text(f, "body");
        if (!subject || !body) throw new Error("Required");
        await prisma.supportTicket.create({
          data: { userId: user.id, bookingId, subject, body },
        });
        break;
      }
      case "supportReply": {
        if (user.role !== "ADMIN") throw new Error("Not authorized");
        const response = text(f, "response");
        if (!response) throw new Error("Required");
        const ticket = await prisma.supportTicket.update({
          where: { id },
          data: { response, status: f.get("resolved") ? "RESOLVED" : "OPEN" },
        });
        await notify(
          ticket.userId,
          "サポートから返信が届きました",
          "Support has replied",
          "/dashboard/workspace?tab=support",
        );
        break;
      }
      case "settings": {
        requireTrainer();
        const timezone = text(f, "timezone", 64);
        if (!validTimezone(timezone)) throw new Error("Invalid timezone");
        await prisma.trainerProfile.update({
          where: { userId: user.id },
          data: {
            timezone,
            region: text(f, "region", 200),
            bookingLeadHours: integer(f, "bookingLeadHours", 0, 720),
            bufferMinutes: integer(f, "bufferMinutes", 0, 180),
            cancellationHours: integer(f, "cancellationHours", 0, 720),
          },
        });
        await prisma.profile.updateMany({
          where: { userId: user.id },
          data: { timezone },
        });
        break;
      }
      case "availability": {
        requireTrainer();
        const timezone = text(f, "timezone", 64);
        if (!validTimezone(timezone)) throw new Error("Invalid timezone");
        const minute = (key: string) => {
          const value = text(f, key, 5);
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
            throw new Error("Invalid time");
          const [h, m] = value.split(":").map(Number);
          return h * 60 + m;
        };
        const startMinute = minute("startTime"),
          endMinute = minute("endTime");
        if (endMinute <= startMinute) throw new Error("Invalid time");
        await prisma.trainerAvailability.create({
          data: {
            trainerId: user.id,
            dayOfWeek: integer(f, "dayOfWeek", 0, 6),
            startMinute,
            endMinute,
            timezone,
          },
        });
        break;
      }
      case "deleteAvailability":
        requireTrainer();
        await prisma.trainerAvailability.deleteMany({
          where: { id, trainerId: user.id },
        });
        break;
      case "exception": {
        requireTrainer();
        const timezone = text(f, "timezone", 64),
          startsAt = localToUtc(text(f, "startsAt", 16), timezone),
          endsAt = localToUtc(text(f, "endsAt", 16), timezone);
        if (endsAt <= startsAt) throw new Error("Invalid date");
        await prisma.availabilityException.create({
          data: {
            trainerId: user.id,
            startsAt,
            endsAt,
            available: f.get("available") === "on",
          },
        });
        break;
      }
      case "deleteException":
        requireTrainer();
        await prisma.availabilityException.deleteMany({
          where: { id, trainerId: user.id },
        });
        break;
      case "offeringDetails": {
        requireTrainer();
        await prisma.sessionOffering.updateMany({
          where: { id, trainerUserId: user.id },
          data: {
            location: text(f, "location", 500),
            preparation: text(f, "preparation"),
            meetingUrl: safeUrl(text(f, "meetingUrl", 2048)),
            isTrial: f.get("isTrial") === "on",
          },
        });
        break;
      }
      case "package": {
        requireTrainer();
        const offeringId = text(f, "offeringId", 100);
        const offering = await prisma.sessionOffering.findFirst({
          where: {
            id: offeringId,
            trainerUserId: user.id,
            isActive: true,
            isTrial: false,
          },
        });
        if (!offering) throw new Error("Choose a regular session");
        const title = text(f, "title", 200);
        if (!title) throw new Error("Required");
        await prisma.sessionPackage.create({
          data: {
            trainerId: user.id,
            offeringId,
            title,
            credits: integer(f, "credits", 2, 50),
            price: integer(f, "price", 50, 1000000),
            currency: offering.currency,
            validityDays: integer(f, "validityDays", 7, 365),
          },
        });
        break;
      }
      case "archivePackage":
        requireTrainer();
        await prisma.sessionPackage.updateMany({
          where: { id, trainerId: user.id },
          data: { active: false },
        });
        break;
      case "buyPackage": {
        requireClient();
        const pack = await prisma.sessionPackage.findFirst({
          where: { id, active: true },
        });
        if (!pack) throw new Error("Not found");
        const trainer = await prisma.user.findUnique({
          where: { id: pack.trainerId },
          include: { stripeAccount: true, trainerProfile: true },
        });
        const offering = await prisma.sessionOffering.findFirst({
          where: { id: pack.offeringId, isActive: true, isTrial: false },
        });
        if (
          !offering ||
          !trainer?.trainerProfile?.isPublished ||
          !trainer.stripeAccount ||
          !isStripeOnboardingComplete(trainer.stripeAccount)
        )
          throw new Error("Unavailable");
        const pass = await prisma.passPurchase.create({
          data: {
            userId: user.id,
            trainerId: pack.trainerId,
            offeringId: pack.offeringId,
            packageId: id,
            title: pack.title,
            credits: pack.credits,
            remaining: pack.credits,
            amount: pack.price,
            currency: pack.currency,
            validityDays: pack.validityDays,
          },
        });
        const amount = toMinor(Number(pack.price), pack.currency);
        const session = await getStripeClient().checkout.sessions.create(
          {
            mode: "payment",
            payment_method_types: ["card"],
            metadata: { passId: pass.id },
            success_url: `${getAppBaseUrl()}/${locale}/dashboard/workspace?tab=passes&saved=1`,
            cancel_url: `${getAppBaseUrl()}/${locale}/dashboard/workspace?tab=passes`,
            payment_intent_data: {
              application_fee_amount: calculatePlatformFeeAmount(amount),
              transfer_data: {
                destination: trainer.stripeAccount.stripeAccountId,
              },
            },
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: pack.currency,
                  unit_amount: amount,
                  product_data: { name: pack.title },
                },
              },
            ],
          },
          { idempotencyKey: `pass:${pass.id}` },
        );
        await prisma.passPurchase.update({
          where: { id: pass.id },
          data: { checkoutSessionId: session.id },
        });
        externalUrl = session.url;
        break;
      }
      case "reviewReply": {
        requireTrainer();
        await prisma.review.updateMany({
          where: { id, targetUserId: user.id },
          data: { trainerReply: text(f, "reply", 1000), repliedAt: new Date() },
        });
        break;
      }
      case "bookingDetails": {
        requireTrainer();
        const changed = await prisma.booking.updateMany({
          where: { id, trainerId: user.id },
          data: {
            location: text(f, "location", 500),
            meetingUrl: safeUrl(text(f, "meetingUrl", 2048)),
            preparation: text(f, "preparation"),
            feedback: text(f, "feedback"),
          },
        });
        if (changed.count)
          await notifyBooking(
            id,
            "予約の案内・フィードバックが更新されました",
            "Booking information or feedback was updated",
          );
        break;
      }
      case "cancel":
        await cancelReservation(id, user.id, text(f, "reason", 300));
        break;
      case "finish": {
        requireTrainer();
        const b = await prisma.booking.findFirst({
          where: { id, trainerId: user.id },
        });
        if (!b || !canFinishBooking(b.status, b.endsAt))
          throw new Error("Only ended, confirmed sessions can be completed");
        const status = f.get("noShow") ? "NO_SHOW" : "COMPLETED";
        const result = await prisma.booking.updateMany({
          where: { id, status: "CONFIRMED" },
          data: { status },
        });
        if (result.count) {
          await notifyBooking(
            id,
            status === "COMPLETED"
              ? "受講が完了しました"
              : "欠席が記録されました",
            status === "COMPLETED"
              ? "Your session is complete"
              : "An absence was recorded",
          );
          if (status === "COMPLETED")
            await notificationService.reviewRequest(id);
        }
        break;
      }
      case "reschedule":
      case "respondSchedule": {
        const original = await prisma.booking.findUniqueOrThrow({
          where: { id },
        });
        if (![original.clientId, original.trainerId].includes(user.id))
          throw new Error("Not authorized");
        await prisma.$transaction(async (db) => {
          await trainerLock(db, original.trainerId);
          await userLock(db, original.clientId);
          const b = await db.booking.findUniqueOrThrow({ where: { id } });
          if (b.status !== "CONFIRMED" || b.startsAt <= new Date())
            throw new Error("Booking cannot be rescheduled");
          if (
            op === "respondSchedule" &&
            (!b.proposedStartsAt ||
              b.proposedBy === user.id ||
              text(f, "proposal") !== b.proposedStartsAt.toISOString())
          )
            throw new Error("Proposal has changed");
          if (op === "respondSchedule" && f.get("decline")) {
            await db.booking.update({
              where: { id },
              data: { proposedStartsAt: null, proposedBy: null },
            });
            return;
          }
          const start =
            op === "reschedule"
              ? new Date(text(f, "startsAtUtc"))
              : b.proposedStartsAt!;
          const end = new Date(
            start.getTime() + b.endsAt.getTime() - b.startsAt.getTime(),
          );
          const schedule = await scheduleData(db, b.trainerId, start, end, id);
          if (!slotAvailable(schedule, start, end))
            throw new Error("Time is not available");
          if (b.passPurchaseId) {
            const pass = await db.passPurchase.findUniqueOrThrow({
              where: { id: b.passPurchaseId },
            });
            if (!pass.expiresAt || start >= pass.expiresAt)
              throw new Error("Pass expires before this session");
          }
          if (
            await db.booking.findFirst({
              where: {
                id: { not: id },
                clientId: b.clientId,
                status: { in: ["PENDING", "CONFIRMED"] },
                startsAt: { lt: end },
                endsAt: { gt: start },
              },
            })
          )
            throw new Error("Client already has a booking");
          if (op === "reschedule")
            await db.booking.update({
              where: { id },
              data: { proposedStartsAt: start, proposedBy: user.id },
            });
          else {
            await db.booking.update({
              where: { id },
              data: {
                startsAt: start,
                endsAt: end,
                proposedStartsAt: null,
                proposedBy: null,
                cancelBefore: new Date(
                  start.getTime() -
                    schedule.profile.cancellationHours * 3600000,
                ),
              },
            });
            await db.notificationLog.deleteMany({
              where: { bookingId: id, type: "BOOKING_REMINDER_24H" },
            });
            await db.appNotification.deleteMany({
              where: {
                dedupeKey: { startsWith: `BOOKING_REMINDER_24H:${id}:` },
              },
            });
          }
        });
        await notifyBooking(
          id,
          "日程変更の依頼・回答が届きました",
          "A rescheduling request or response is available",
        );
        break;
      }
      default:
        throw new Error("Unknown action");
    }
  } catch (error) {
    console.error("Marketplace action failed", {
      op,
      error: error instanceof Error ? error.message : "Unknown",
    });
    redirect(`${destination}${destination.includes("?") ? "&" : "?"}error=1`);
  }
  revalidatePath(`/${locale}/dashboard`, "layout");
  revalidatePath(`/${locale}/trainers`, "layout");
  redirect(
    externalUrl ||
      `${destination}${destination.includes("?") ? "&" : "?"}saved=1`,
  );
}
