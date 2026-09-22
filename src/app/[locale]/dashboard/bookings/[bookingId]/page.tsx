import { statusLabel } from "@/lib/marketplace/labels";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDbUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/constants/locales";
import { prisma } from "@/lib/prisma";
import {
  Form,
  Field,
  Hidden,
  Panel,
  Notice,
} from "@/components/marketplace/forms";
import { SlotPicker } from "@/components/marketplace/slot-picker";
import { canFinishBooking, refundable } from "@/lib/marketplace/rules";
export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; bookingId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { locale, bookingId } = await params,
    query = await searchParams,
    user = await requireDbUser(locale),
    ja = locale === "ja";
  const b = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      OR: [{ clientId: user.id }, { trainerId: user.id }],
    },
    include: {
      sessionOffering: true,
      trainer: { include: { profile: true } },
      client: { include: { profile: true } },
    },
  });
  if (!b) notFound();
  const trainer = user.id === b.trainerId;
  const messages = await prisma.message.findMany({
    where: { bookingId: b.id, trainerId: b.trainerId, clientId: b.clientId },
    orderBy: { createdAt: "asc" },
  });
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
  const timezone = profile?.timezone || b.timezone;
  const date = (d: Date) =>
    new Intl.DateTimeFormat(ja ? "ja-JP" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(d);
  const editable = b.status === "CONFIRMED" && b.startsAt > new Date();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        className="text-blue-700 underline"
        href={`/${locale}/dashboard/workspace?tab=bookings`}
      >
        {ja ? "予約一覧へ" : "All bookings"}
      </Link>
      <h1 className="text-2xl font-bold">
        {ja
          ? b.sessionOffering.titleJa || b.sessionOffering.titleEn
          : b.sessionOffering.titleEn}
      </h1>
      <Notice locale={locale} {...query} />
      <Panel title={ja ? "予約詳細" : "Booking details"}>
        <p>
          {trainer
            ? b.client.profile?.displayName
            : b.trainer.profile?.displayName}
        </p>
        <p>
          {date(b.startsAt)} – {date(b.endsAt)} ({timezone})
        </p>
        <p>
          {ja ? "状態" : "Status"}: {statusLabel(b.status, locale)}
        </p>
        {!trainer && b.status === "PENDING" && b.stripeCheckoutSessionId && (
          <Form
            locale={locale}
            op="resumePayment"
            id={b.id}
            booking={b.id}
            submit={ja ? "決済を再開" : "Resume payment"}
          />
        )}
        <p>
          {ja ? "金額" : "Amount"}:{" "}
          {new Intl.NumberFormat(locale, {
            style: "currency",
            currency: b.currency,
          }).format(Number(b.amountPaid))}
        </p>
        {b.passPurchaseId && (
          <p>{ja ? "回数券利用" : "Paid using a session credit"}</p>
        )}
        {b.seriesId && (
          <p>
            {ja
              ? "毎週の定期予約の1回分です。変更・キャンセルはこの回のみが対象です。"
              : "Part of a weekly series. Changes and cancellations affect this occurrence only."}
          </p>
        )}
        <p>
          {ja ? "キャンセル無料期限" : "Free cancellation until"}:{" "}
          {date(b.cancelBefore ?? b.startsAt)}
        </p>
        <p className="text-sm text-slate-600">
          {ja
            ? "期限後のお客様都合のキャンセルは返金・回数返却の対象外です。トレーナー都合は全額返金または回数返却です。"
            : "Late client cancellations do not receive a refund or credit. Trainer cancellations receive a full refund or credit."}
        </p>
        {b.cancellationReason && (
          <p>
            {ja ? "キャンセル理由" : "Cancellation reason"}:{" "}
            {b.cancellationReason}
          </p>
        )}
        {b.refundStatus !== "NONE" && (
          <p>
            {ja ? "返金状況" : "Refund status"}:{" "}
            {statusLabel(b.refundStatus, locale)} ·{" "}
            {Number(b.refundAmount ?? 0)} {b.currency}
          </p>
        )}
        <Link
          className="text-blue-700 underline"
          href={`/${locale}/trainers/${b.sessionOffering.trainerProfileId}?offering=${b.sessionOfferingId}#book-session`}
        >
          {ja ? "同じメニューを予約" : "Book this session again"}
        </Link>
      </Panel>
      <Panel
        title={
          ja
            ? "開催案内・受講後のフィードバック"
            : "Joining information and feedback"
        }
      >
        {b.location && (
          <p className="whitespace-pre-wrap">
            {ja ? "場所" : "Location"}: {b.location}
          </p>
        )}
        {b.meetingUrl && /^https:\/\//.test(b.meetingUrl) && (
          <a
            className="text-blue-700 underline"
            href={b.meetingUrl}
            target="_blank"
            rel="noreferrer"
          >
            {ja ? "オンラインセッションに参加" : "Join online session"}
          </a>
        )}
        <p className="whitespace-pre-wrap">
          {b.preparation ||
            (ja
              ? "持ち物・参加方法はトレーナーにご確認ください。"
              : "Ask your trainer about preparation and joining instructions.")}
        </p>
        {b.feedback && <p className="whitespace-pre-wrap">{b.feedback}</p>}
        {trainer && (
          <Form locale={locale} op="bookingDetails" id={b.id} booking={b.id}>
            <Field
              label={
                ja ? "場所・集合方法" : "Location and meeting instructions"
              }
              name="location"
              value={b.location}
            />
            <Field
              label={ja ? "参加URL" : "Meeting URL"}
              name="meetingUrl"
              type="url"
              value={b.meetingUrl}
            />
            <Field
              label={
                ja
                  ? "持ち物・事前準備・連絡先"
                  : "Preparation and contact details"
              }
              name="preparation"
              type="textarea"
              value={b.preparation}
            />
            <Field
              label={ja ? "受講後のフィードバック" : "Session feedback"}
              name="feedback"
              type="textarea"
              value={b.feedback}
            />
          </Form>
        )}
      </Panel>
      {editable && (
        <Panel title={ja ? "日程変更" : "Reschedule"}>
          {b.proposedStartsAt && (
            <div className="space-y-3 rounded-lg bg-blue-50 p-3">
              <p>
                {ja ? "提案日時" : "Proposed time"}: {date(b.proposedStartsAt)}
              </p>
              {b.proposedBy !== user.id ? (
                <>
                  <Form
                    locale={locale}
                    op="respondSchedule"
                    id={b.id}
                    booking={b.id}
                    submit={ja ? "変更を承認" : "Accept change"}
                  >
                    <Hidden
                      name="proposal"
                      value={b.proposedStartsAt.toISOString()}
                    />
                  </Form>
                  <Form
                    locale={locale}
                    op="respondSchedule"
                    id={b.id}
                    booking={b.id}
                    submit={ja ? "変更を辞退" : "Decline change"}
                  >
                    <Hidden
                      name="proposal"
                      value={b.proposedStartsAt.toISOString()}
                    />
                    <Hidden name="decline" value="1" />
                  </Form>
                </>
              ) : (
                <p>
                  {ja
                    ? "相手の回答を待っています。承認されるまで元の日程が有効です。"
                    : "Waiting for a reply. Your original time remains booked until accepted."}
                </p>
              )}
            </div>
          )}
          <Form
            locale={locale}
            op="reschedule"
            id={b.id}
            booking={b.id}
            submit={ja ? "変更を提案" : "Propose change"}
          >
            <SlotPicker
              offeringId={b.sessionOfferingId}
              bookingId={b.id}
              ja={ja}
            />
          </Form>
        </Panel>
      )}
      {trainer && canFinishBooking(b.status, b.endsAt) && (
        <Panel title={ja ? "受講結果" : "Attendance"}>
          <Form
            locale={locale}
            op="finish"
            id={b.id}
            booking={b.id}
            submit={ja ? "受講完了にする" : "Mark completed"}
          />
          <Form
            locale={locale}
            op="finish"
            id={b.id}
            booking={b.id}
            submit={ja ? "無断欠席を記録" : "Mark no-show"}
          >
            <Hidden name="noShow" value="1" />
          </Form>
        </Panel>
      )}
      {((["PENDING", "CONFIRMED"].includes(b.status) &&
        (trainer || b.startsAt > new Date())) ||
        (b.status === "CANCELED" &&
          ["FAILED", "PENDING"].includes(b.refundStatus))) && (
        <Panel title={ja ? "キャンセル・返金" : "Cancellation and refund"}>
          <p>
            {(
              b.status === "CANCELED"
                ? Number(b.refundAmount) > 0 ||
                  b.refundStatus === "CREDIT_RETURNED"
                : refundable(b, trainer)
            )
              ? ja
                ? "期限内のキャンセルは全額返金（回数券は回数返却）です。"
                : "Eligible cancellations receive a full refund or returned credit."
              : ja
                ? "無料期限を過ぎています。キャンセルしても返金・回数返却はありません。"
                : "The free cancellation deadline has passed. No refund or credit will be issued."}
          </p>
          <Form
            locale={locale}
            op="cancel"
            id={b.id}
            booking={b.id}
            submit={
              b.status === "CANCELED"
                ? ja
                  ? "返金処理を再確認"
                  : "Retry refund"
                : ja
                  ? "予約をキャンセルする"
                  : "Cancel booking"
            }
          >
            <Field
              label={ja ? "理由" : "Reason"}
              name="reason"
              value={b.cancellationReason}
            />
            <label className="text-sm">
              <input type="checkbox" required />{" "}
              {ja
                ? "上記の条件を確認しました"
                : "I have reviewed these conditions"}
            </label>
          </Form>
        </Panel>
      )}
      <Panel title={ja ? "この予約について連絡" : "Booking messages"}>
        {messages.map((m) => (
          <article key={m.id} className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">
              {m.senderId === user.id
                ? ja
                  ? "あなた"
                  : "You"
                : ja
                  ? "相手"
                  : "Other participant"}{" "}
              · {date(m.createdAt)}
            </p>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </article>
        ))}
        <Form
          locale={locale}
          op="message"
          booking={b.id}
          submit={ja ? "送信" : "Send"}
        >
          <Hidden name="trainerId" value={b.trainerId} />
          <Hidden name="clientId" value={b.clientId} />
          <Hidden name="bookingId" value={b.id} />
          <Field
            label={ja ? "メッセージ" : "Message"}
            name="body"
            type="textarea"
            required
          />
        </Form>
      </Panel>
      <Panel title={ja ? "サポートへ相談" : "Contact support"}>
        <Form
          locale={locale}
          op="support"
          booking={b.id}
          submit={ja ? "問い合わせを送信" : "Submit ticket"}
        >
          <Hidden name="bookingId" value={b.id} />
          <Field label={ja ? "件名" : "Subject"} name="subject" required />
          <Field
            label={ja ? "相談内容" : "Details"}
            name="body"
            type="textarea"
            required
          />
        </Form>
      </Panel>
    </div>
  );
}
