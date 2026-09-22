import { config } from "dotenv";
if (process.env.DOTENV_CONFIG_PATH)
  config({ path: process.env.DOTENV_CONFIG_PATH, quiet: true });
else {
  config({ path: ".env.local", quiet: true });
  config({ quiet: true });
}
if (!process.env.NEXT_PUBLIC_APP_URL || !process.env.CRON_SECRET) {
  throw new Error("NEXT_PUBLIC_APP_URL and CRON_SECRET must be configured");
}
const response = await fetch(
  new URL("/api/cron/booking-reminders", process.env.NEXT_PUBLIC_APP_URL),
  {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    signal: AbortSignal.timeout(120000),
  },
);
if (!response.ok) throw new Error(`Maintenance failed (${response.status})`);
console.log(await response.json());
