import assert from "node:assert/strict";
const base = process.env.SMOKE_BASE_URL || "http://localhost:3100";
const check = async (path, status, options = {}) => {
  const response = await fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
    ...options,
  });
  assert.equal(
    response.status,
    status,
    `${path}: expected ${status}, got ${response.status}`,
  );
  console.log(`PASS ${options.method || "GET"} ${path}: ${response.status}`);
  return response;
};
const directory = await check("/ja/trainers", 200);
const html = await directory.text();
assert.ok(html.includes("対応言語") && html.includes("料金上限"));
const trainerPath = html.match(/\/ja\/trainers\/[a-z0-9]+/)?.[0];
if (trainerPath) await check(trainerPath, 200);
await check("/en/trainers", 200);
const availability = await check(
  "/api/availability?offering=missing&day=2026-10-01&timezone=UTC",
  200,
);
assert.deepEqual(await availability.json(), { slots: [] });
await check("/api/availability?offering=missing&day=invalid&timezone=UTC", 400);
await check(
  "/api/availability?offering=missing&day=2026-10-01&timezone=UTC&booking=private",
  401,
);
await check("/api/discovery?day=2026-10-01&timezone=Invalid", 400);
await check("/api/stripe/webhook", 400, { method: "POST" });
await check("/api/cron/booking-reminders", 401);
await check("/api/trainer-views", 403, {
  method: "POST",
  headers: {
    Origin: "https://untrusted.example",
    "Content-Type": "application/json",
  },
  body: "{}",
});
const protectedResponse = await fetch(
  new URL("/ja/dashboard/workspace", base),
  { redirect: "manual", signal: AbortSignal.timeout(30000) },
);
assert.ok(
  [302, 303, 307, 401, 404].includes(protectedResponse.status),
  `Unauthenticated workspace must not render (${protectedResponse.status})`,
);
console.log(
  `PASS authenticated workspace rejects signed-out requests: ${protectedResponse.status}`,
);
