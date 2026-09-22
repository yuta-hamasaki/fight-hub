import { statusLabel } from "@/lib/marketplace/labels";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/constants/locales";
import {
  Form,
  Field,
  Hidden,
  Panel,
  inputClass,
} from "@/components/marketplace/forms";
export async function TrainerSettings({
  locale,
  userId,
}: {
  locale: Locale;
  userId: string;
}) {
  const ja = locale === "ja";
  const [p, windows, exceptions, offerings] = await Promise.all([
    prisma.trainerProfile.findUnique({ where: { userId } }),
    prisma.trainerAvailability.findMany({
      where: { trainerId: userId },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    }),
    prisma.availabilityException.findMany({
      where: { trainerId: userId },
      orderBy: { startsAt: "asc" },
    }),
    prisma.sessionOffering.findMany({
      where: { trainerUserId: userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!p)
    return (
      <p>
        {ja
          ? "先にプロフィールを作成してください。"
          : "Create your trainer profile first."}
      </p>
    );
  const time = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const days = ja
    ? ["日", "月", "火", "水", "木", "金", "土"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="space-y-6">
      <Panel title={ja ? "予約ルール" : "Booking rules"}>
        <Form locale={locale} op="settings" tab="settings">
          <Field
            label={ja ? "地域・最寄り駅" : "Region / nearest station"}
            name="region"
            value={p.region}
          />
          <Field
            label={
              ja
                ? "タイムゾーン（例 Asia/Tokyo）"
                : "Time zone (e.g. America/Vancouver)"
            }
            name="timezone"
            value={p.timezone}
            required
          />
          <Field
            label={
              ja ? "予約締切（開始何時間前）" : "Booking lead time (hours)"
            }
            name="bookingLeadHours"
            type="number"
            min={0}
            max={720}
            value={p.bookingLeadHours}
          />
          <Field
            label={
              ja ? "前後の準備時間（分）" : "Buffer between sessions (minutes)"
            }
            name="bufferMinutes"
            type="number"
            min={0}
            max={180}
            value={p.bufferMinutes}
          />
          <Field
            label={
              ja
                ? "無料キャンセル期限（開始何時間前）"
                : "Free cancellation deadline (hours before)"
            }
            name="cancellationHours"
            type="number"
            min={0}
            max={720}
            value={p.cancellationHours}
          />
          <p className="text-sm text-slate-500">
            {ja
              ? "キャンセル期限は新しい予約に適用されます。既存予約の期限は変わりません。"
              : "Cancellation rules apply to new bookings. Existing deadlines remain unchanged."}
          </p>
        </Form>
      </Panel>
      <Panel title={ja ? "毎週の受付時間" : "Weekly availability"}>
        <p className="text-sm">
          {ja
            ? "時間を設定していない曜日は予約を受け付けません。日をまたぐ枠は分割して登録してください。"
            : "Days without hours are closed. Split overnight availability into separate days."}
        </p>
        {windows.map((w) => (
          <div
            key={w.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <span>
              {days[w.dayOfWeek]} {time(w.startMinute)}–{time(w.endMinute)} (
              {w.timezone})
            </span>
            <Form
              locale={locale}
              op="deleteAvailability"
              id={w.id}
              tab="settings"
              submit={ja ? "削除" : "Delete"}
            />
          </div>
        ))}
        <Form
          locale={locale}
          op="availability"
          tab="settings"
          submit={ja ? "時間帯を追加" : "Add hours"}
        >
          <label className="grid gap-1 text-sm">
            {ja ? "曜日" : "Day"}
            <select className={inputClass} name="dayOfWeek">
              {days.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <Field
            label={ja ? "開始" : "Start"}
            type="time"
            name="startTime"
            required
          />
          <Field
            label={ja ? "終了" : "End"}
            type="time"
            name="endTime"
            required
          />
          <Field
            label={ja ? "タイムゾーン" : "Time zone"}
            name="timezone"
            value={p.timezone}
            required
          />
        </Form>
      </Panel>
      <Panel
        title={ja ? "休業・臨時の受付時間" : "Closures and additional hours"}
      >
        <p className="text-sm">
          {ja
            ? "休業を登録しても既存の予約は取り消されません。必要に応じて各予約から変更・キャンセルしてください。"
            : "Closures do not cancel existing bookings. Reschedule or cancel those individually."}
        </p>
        {exceptions.map((e) => (
          <div key={e.id} className="space-y-2 rounded-lg border p-3">
            <p>
              {e.available
                ? ja
                  ? "追加枠"
                  : "Additional hours"
                : ja
                  ? "休業"
                  : "Closed"}{" "}
              ·{" "}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: p.timezone,
              }).format(e.startsAt)}{" "}
              –{" "}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: p.timezone,
              }).format(e.endsAt)}
            </p>
            <Form
              locale={locale}
              op="deleteException"
              id={e.id}
              tab="settings"
              submit={ja ? "削除" : "Delete"}
            />
          </div>
        ))}
        <Form
          locale={locale}
          op="exception"
          tab="settings"
          submit={ja ? "例外日程を追加" : "Add exception"}
        >
          <Field
            label={ja ? "開始" : "Start"}
            name="startsAt"
            type="datetime-local"
            required
          />
          <Field
            label={ja ? "終了" : "End"}
            name="endsAt"
            type="datetime-local"
            required
          />
          <Field
            label={ja ? "タイムゾーン" : "Time zone"}
            name="timezone"
            value={p.timezone}
            required
          />
          <label className="text-sm">
            <input type="checkbox" name="available" />{" "}
            {ja
              ? "この時間帯を予約可能にする（未選択は休業）"
              : "Open this time (unchecked means closed)"}
          </label>
        </Form>
      </Panel>
      <Panel
        title={
          ja
            ? "セッションの開催情報・体験設定"
            : "Session instructions and trials"
        }
      >
        {offerings.map((o) => (
          <details key={o.id} className="rounded-lg border p-4">
            <summary className="cursor-pointer font-bold">
              {ja ? o.titleJa || o.titleEn : o.titleEn}
            </summary>
            <Form locale={locale} op="offeringDetails" id={o.id} tab="settings">
              <Field
                label={ja ? "場所・集合方法" : "Location"}
                name="location"
                value={o.location}
              />
              <Field
                label={ja ? "オンライン参加URL" : "Meeting URL"}
                name="meetingUrl"
                type="url"
                value={o.meetingUrl}
              />
              <Field
                label={ja ? "持ち物・事前準備" : "Preparation"}
                name="preparation"
                type="textarea"
                value={o.preparation}
              />
              <label className="text-sm">
                <input
                  name="isTrial"
                  type="checkbox"
                  defaultChecked={o.isTrial}
                />{" "}
                {ja
                  ? "体験セッション（1人につきこのトレーナーで1回）"
                  : "Trial (once per client for this trainer)"}
              </label>
              <p className="text-sm">
                {ja
                  ? "新規予約に適用されます。既存予約は予約詳細から編集できます。"
                  : "Applies to new bookings. Edit existing bookings individually."}
              </p>
            </Form>
          </details>
        ))}
      </Panel>
    </div>
  );
}
export async function Coaching({
  locale,
  userId,
  trainer,
  clientId,
}: {
  locale: Locale;
  userId: string;
  trainer: boolean;
  clientId?: string;
}) {
  const ja = locale === "ja";
  if (!trainer) {
    const [intake, tasks, bookings] = await Promise.all([
      prisma.clientIntake.findUnique({ where: { userId } }),
      prisma.assignment.findMany({
        where: { clientId: userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.findMany({
        where: {
          clientId: userId,
          status: "COMPLETED",
          feedback: { not: null },
        },
        include: { sessionOffering: true },
        orderBy: { startsAt: "desc" },
      }),
    ]);
    return (
      <div className="space-y-6">
        <Panel title={ja ? "目標・事前ヒアリング" : "Goals and intake"}>
          <p className="text-sm">
            {ja
              ? "予約が確定したトレーナー・契約中のトレーナーに共有されます。必要な情報だけを入力してください。"
              : "Shared with trainers you have confirmed sessions or an active membership with. Include only information you want to share."}
          </p>
          <Form locale={locale} op="intake" tab="coaching">
            <Field
              label={ja ? "目標" : "Goals"}
              name="goals"
              type="textarea"
              value={intake?.goals}
            />
            <Field
              label={ja ? "経験・レベル" : "Experience"}
              name="experience"
              type="textarea"
              value={intake?.experience}
            />
            <Field
              label={
                ja ? "指導で配慮してほしいこと" : "Considerations for coaching"
              }
              name="considerations"
              type="textarea"
              value={intake?.considerations}
            />
            <Field
              label={ja ? "タイムゾーン" : "Time zone"}
              name="timezone"
              value={intake?.timezone || "Asia/Tokyo"}
              required
            />
          </Form>
        </Panel>
        <Panel title={ja ? "課題・進捗" : "Assignments and progress"}>
          <p>
            {tasks.filter((t) => t.completedAt).length} / {tasks.length}{" "}
            {ja ? "完了" : "completed"}
          </p>
          {tasks.map((t) => (
            <article className="space-y-3 rounded-lg border p-4" key={t.id}>
              <h3 className="font-bold">{t.title}</h3>
              <p className="whitespace-pre-wrap">{t.instructions}</p>
              {t.dueAt && (
                <p>
                  {ja ? "期限" : "Due"}: {t.dueAt.toISOString().slice(0, 10)}
                </p>
              )}
              <Form locale={locale} op="progress" id={t.id} tab="coaching">
                <Field
                  label={
                    ja
                      ? "実施内容・質問・感想"
                      : "Progress, questions and notes"
                  }
                  name="progress"
                  type="textarea"
                  value={t.progress}
                />
                <label>
                  <input
                    type="checkbox"
                    name="completed"
                    defaultChecked={!!t.completedAt}
                  />{" "}
                  {ja ? "完了" : "Completed"}
                </label>
              </Form>
            </article>
          ))}
          {!tasks.length && (
            <p>{ja ? "課題はまだありません。" : "No assignments yet."}</p>
          )}
        </Panel>
        <Panel title={ja ? "受講記録" : "Session feedback"}>
          {bookings.map((b) => (
            <Link
              className="block rounded-lg border p-3"
              key={b.id}
              href={`/${locale}/dashboard/bookings/${b.id}`}
            >
              <p className="font-bold">{b.sessionOffering.titleEn}</p>
              <p className="whitespace-pre-wrap">{b.feedback}</p>
            </Link>
          ))}
          {!bookings.length && (
            <p>{ja ? "受講記録はまだありません。" : "No feedback yet."}</p>
          )}
        </Panel>
      </div>
    );
  }
  const [bookings, members] = await Promise.all([
    prisma.booking.findMany({
      where: {
        trainerId: userId,
        status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] },
      },
      select: { clientId: true },
    }),
    prisma.subscriptionPurchase.findMany({
      where: {
        status: "ACTIVE",
        subscriptionPlan: { trainerProfile: { userId } },
      },
      select: { userId: true },
    }),
  ]);
  const ids = [
    ...new Set([
      ...bookings.map((b) => b.clientId),
      ...members.map((m) => m.userId),
    ]),
  ];
  const people = await prisma.user.findMany({
    where: { id: { in: ids } },
    include: { profile: true },
  });
  const selected = people.find((p) => p.id === clientId);
  const [intake, note, tasks, history] = selected
    ? await Promise.all([
        prisma.clientIntake.findUnique({ where: { userId: selected.id } }),
        prisma.coachingRecord.findUnique({
          where: {
            trainerId_clientId: { trainerId: userId, clientId: selected.id },
          },
        }),
        prisma.assignment.findMany({
          where: { trainerId: userId, clientId: selected.id },
          orderBy: { createdAt: "desc" },
        }),
        prisma.booking.findMany({
          where: { trainerId: userId, clientId: selected.id },
          include: { sessionOffering: true },
          orderBy: { startsAt: "desc" },
        }),
      ])
    : [null, null, [], []];
  return (
    <div className="space-y-6">
      <Panel title={ja ? "顧客一覧" : "Clients"}>
        <div className="flex flex-wrap gap-3">
          {people.map((p) => (
            <Link
              className="rounded-lg border p-3 text-blue-700"
              key={p.id}
              href={`/${locale}/dashboard/workspace?tab=coaching&client=${p.id}`}
            >
              {p.profile?.displayName || p.email}
            </Link>
          ))}
        </div>
        {!people.length && (
          <p>
            {ja
              ? "確定予約または有効な月額契約の顧客が表示されます。"
              : "Clients with confirmed sessions or active memberships appear here."}
          </p>
        )}
      </Panel>
      {selected && (
        <>
          <Panel title={selected.profile?.displayName || "Client"}>
            <p className="whitespace-pre-wrap">
              {ja ? "目標" : "Goals"}: {intake?.goals || "—"}
            </p>
            <p className="whitespace-pre-wrap">
              {ja ? "経験" : "Experience"}: {intake?.experience || "—"}
            </p>
            <p className="whitespace-pre-wrap">
              {ja ? "配慮事項" : "Considerations"}:{" "}
              {intake?.considerations || "—"}
            </p>
            <Form locale={locale} op="notes" tab="coaching">
              <Hidden name="clientId" value={selected.id} />
              <Field
                label={
                  ja
                    ? "非公開カルテ（あなたのみ閲覧可能）"
                    : "Private notes (only visible to you)"
                }
                name="privateNotes"
                type="textarea"
                value={note?.privateNotes}
              />
            </Form>
          </Panel>
          <Panel title={ja ? "課題を配信" : "Assign coaching"}>
            <Form
              locale={locale}
              op="assignment"
              tab="coaching"
              submit={ja ? "課題を送信" : "Assign"}
            >
              <Hidden name="clientId" value={selected.id} />
              <Field label={ja ? "課題名" : "Title"} name="title" required />
              <Field
                label={ja ? "メニュー・実施方法" : "Instructions"}
                name="instructions"
                type="textarea"
                required
              />
              <Field
                label={ja ? "期限（任意）" : "Due date (optional)"}
                name="dueAt"
                type="date"
              />
            </Form>
            {tasks.map((t) => (
              <article key={t.id} className="rounded-lg border p-3">
                <h3 className="font-bold">
                  {t.title} ·{" "}
                  {t.completedAt
                    ? ja
                      ? "完了"
                      : "Completed"
                    : ja
                      ? "未完了"
                      : "Open"}
                </h3>
                <p className="whitespace-pre-wrap">{t.instructions}</p>
                <p className="whitespace-pre-wrap text-blue-700">
                  {t.progress}
                </p>
              </article>
            ))}
          </Panel>
          <Panel title={ja ? "指導履歴" : "Session history"}>
            {history.map((b) => (
              <Link
                className="block rounded-lg border p-3"
                key={b.id}
                href={`/${locale}/dashboard/bookings/${b.id}`}
              >
                {b.startsAt.toISOString().slice(0, 10)} ·{" "}
                {b.sessionOffering.titleEn} · {statusLabel(b.status, locale)}
              </Link>
            ))}
          </Panel>
          <Panel title={ja ? "顧客へ連絡" : "Contact client"}>
            <Form
              locale={locale}
              op="message"
              tab="messages"
              submit={ja ? "送信" : "Send"}
            >
              <Hidden name="clientId" value={selected.id} />
              <Field
                label={ja ? "メッセージ" : "Message"}
                name="body"
                type="textarea"
                required
              />
            </Form>
          </Panel>
        </>
      )}
    </div>
  );
}
export async function Analytics({
  locale,
  userId,
}: {
  locale: Locale;
  userId: string;
}) {
  const ja = locale === "ja",
    p = await prisma.trainerProfile.findUnique({ where: { userId } });
  if (!p) return null;
  const since = new Date(new Date().getTime() - 30 * 86400000);
  const [views, bookings, all] = await Promise.all([
    prisma.profileView.count({
      where: {
        trainerProfileId: p.id,
        day: { gte: since.toISOString().slice(0, 10) },
      },
    }),
    prisma.booking.findMany({
      where: {
        trainerId: userId,
        createdAt: { gte: since },
        status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] },
      },
      select: { clientId: true },
    }),
    prisma.booking.groupBy({
      by: ["clientId"],
      where: { trainerId: userId, status: "COMPLETED" },
      _count: true,
    }),
  ]);
  const buyers = new Set(bookings.map((b) => b.clientId)).size,
    repeat = all.filter((x) => x._count > 1).length;
  return (
    <Panel title={ja ? "集客・リピート分析" : "Discovery and retention"}>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          [
            ja ? "直近30日のプロフィール閲覧" : "Profile views in 30 days",
            views,
          ],
          [ja ? "直近30日の予約者数" : "Clients booking in 30 days", buyers],
          [
            ja ? "受講者のリピート率" : "Repeat client rate",
            all.length ? `${Math.round((repeat / all.length) * 100)}%` : "—",
          ],
        ].map(([label, value]) => (
          <div className="rounded-lg bg-blue-50 p-4" key={label}>
            <p>{label}</p>
            <p className="text-3xl font-bold text-blue-700">{value}</p>
          </div>
        ))}
      </div>
      <p>
        {ja
          ? "閲覧あたり予約者率（参考）"
          : "Clients / profile views (indicative)"}
        : {views ? `${((buyers / views) * 100).toFixed(1)}%` : "—"}
      </p>
      <p className="text-sm text-slate-500">
        {ja
          ? "閲覧はブラウザごとに1日1回集計。リピート率は受講完了者のうち2回以上受講した人の割合です。予約者率は同一ユーザーの追跡に基づく厳密な転換率ではありません。導入前の閲覧は含みません。"
          : "Views are deduplicated per browser per day. Repeat rate counts clients with at least two completed sessions. The booking ratio is indicative, not an attributed conversion funnel. Views before tracking was installed are not included."}
      </p>
    </Panel>
  );
}
export async function Passes({
  locale,
  userId,
  trainer,
}: {
  locale: Locale;
  userId: string;
  trainer: boolean;
}) {
  const ja = locale === "ja";
  if (trainer) {
    const [packages, offerings] = await Promise.all([
      prisma.sessionPackage.findMany({
        where: { trainerId: userId },
        orderBy: { title: "asc" },
      }),
      prisma.sessionOffering.findMany({
        where: { trainerUserId: userId, isActive: true, isTrial: false },
      }),
    ]);
    return (
      <Panel title={ja ? "回数券の販売" : "Session packages"}>
        <p className="text-sm">
          {ja
            ? "利用期限内のセッションに使用できます。お客様は回数券で毎週の予約をまとめて取れます。回数券自体の返金相談はサポートで受け付けます。"
            : "Credits can be used for sessions before expiry, including weekly bookings. Package refund requests go through support."}
        </p>
        {packages.map((p) => (
          <article key={p.id} className="space-y-2 rounded-lg border p-3">
            <p>
              {p.title} · {p.credits} {ja ? "回" : "credits"} ·{" "}
              {Number(p.price)} {p.currency} · {p.validityDays}{" "}
              {ja ? "日間" : "days"} ·{" "}
              {p.active
                ? ja
                  ? "販売中"
                  : "Active"
                : ja
                  ? "販売停止"
                  : "Archived"}
            </p>
            {p.active && (
              <Form
                locale={locale}
                op="archivePackage"
                id={p.id}
                tab="passes"
                submit={ja ? "販売を停止" : "Stop selling"}
              />
            )}
          </article>
        ))}
        {!!offerings.length && (
          <Form
            locale={locale}
            op="package"
            tab="passes"
            submit={ja ? "回数券を作成" : "Create package"}
          >
            <Field
              label={ja ? "回数券名" : "Package name"}
              name="title"
              required
            />
            <label className="grid gap-1 text-sm">
              {ja ? "対象セッション" : "Session"}
              <select name="offeringId" className={inputClass}>
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titleEn}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label={ja ? "回数" : "Credits"}
              name="credits"
              type="number"
              min={2}
              max={50}
              value={4}
            />
            <Field
              label={ja ? "合計価格（円）" : "Total price (JPY)"}
              name="price"
              type="number"
              min={50}
              max={1000000}
              required
            />
            <Field
              label={
                ja ? "購入からの有効日数" : "Validity (days from purchase)"
              }
              name="validityDays"
              type="number"
              min={7}
              max={365}
              value={90}
            />
          </Form>
        )}
      </Panel>
    );
  }
  const passes = await prisma.passPurchase.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const offerings = await prisma.sessionOffering.findMany({
    where: { id: { in: passes.map((p) => p.offeringId) } },
  });
  return (
    <Panel title={ja ? "購入した回数券" : "My session passes"}>
      {passes.map((p) => (
        <article key={p.id} className="space-y-2 rounded-lg border p-4">
          <h3 className="font-bold">{p.title}</h3>
          <p>
            {p.remaining} / {p.credits} {ja ? "回残り" : "credits remaining"} ·{" "}
            {statusLabel(
              p.expiresAt && p.expiresAt < new Date() ? "EXPIRED" : p.status,
              locale,
            )}
          </p>
          <p>
            {ja ? "利用期限" : "Valid until"}:{" "}
            {p.expiresAt?.toISOString().slice(0, 10) || "—"}
          </p>
          {p.status === "ACTIVE" &&
            p.remaining > 0 &&
            p.expiresAt &&
            p.expiresAt > new Date() && (
              <Link
                className="text-blue-700 underline"
                href={`/${locale}/trainers/${offerings.find((o) => o.id === p.offeringId)?.trainerProfileId}?offering=${p.offeringId}#book-session`}
              >
                {ja
                  ? "回数券で予約・毎週の定期予約"
                  : "Book a session or weekly series"}
              </Link>
            )}
        </article>
      ))}
      {!passes.length && (
        <p>
          {ja
            ? "トレーナー詳細から回数券を購入できます。"
            : "Purchase packages from trainer profiles."}
        </p>
      )}
    </Panel>
  );
}
