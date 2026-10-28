import { pathToFileURL } from "node:url";
import { config } from "dotenv";

// Validate configuration without contacting providers or printing credentials.
export function validateProductionEnvironment(env) {
  const errors = [];
  for (const name of [
    "DATABASE_URL",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_CONNECT_WEBHOOK_SECRET",
    "CRON_SECRET",
    "SUPPORT_EMAIL",
  ]) {
    if (!env[name]?.trim()) errors.push(`${name} is required`);
  }
  const validUrl = (name, validate) => {
    if (!env[name]) return;
    try {
      if (!validate(new URL(env[name])))
        errors.push(`${name} is not suitable for production`);
    } catch {
      errors.push(`${name} must be a valid URL`);
    }
  };
  validUrl("DATABASE_URL", (url) =>
    ["postgres:", "postgresql:"].includes(url.protocol),
  );
  validUrl("DATABASE_URL_UNPOOLED", (url) =>
    ["postgres:", "postgresql:"].includes(url.protocol),
  );
  validUrl(
    "NEXT_PUBLIC_APP_URL",
    (url) =>
      url.protocol === "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password,
  );
  for (const [name, pattern] of [
    ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", /^pk_live_.+/],
    ["CLERK_SECRET_KEY", /^sk_live_.+/],
    ["STRIPE_SECRET_KEY", /^(sk|rk)_live_.+/],
    ["STRIPE_WEBHOOK_SECRET", /^whsec_.+/],
    ["STRIPE_CONNECT_WEBHOOK_SECRET", /^whsec_.+/],
  ]) {
    if (env[name] && !pattern.test(env[name]))
      errors.push(`${name} must use a production credential`);
  }
  if (env.CRON_SECRET && env.CRON_SECRET.length < 32)
    errors.push("CRON_SECRET must contain at least 32 characters");
  if (
    env.SUPPORT_EMAIL &&
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.SUPPORT_EMAIL)
  )
    errors.push("SUPPORT_EMAIL must be a valid email address");
  return errors;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.env.DOTENV_CONFIG_PATH)
    config({ path: process.env.DOTENV_CONFIG_PATH, quiet: true });
  else {
    config({ path: ".env.local", quiet: true });
    config({ quiet: true });
  }
  const errors = validateProductionEnvironment(process.env);
  if (errors.length) {
    console.error(
      "Production configuration needs attention:\n" +
        errors.map((error) => `- ${error}`).join("\n"),
    );
    process.exitCode = 1;
  } else
    console.log(
      "Production environment format checks passed. Verify provider settings and complete docs/release-checklist.md before launch.",
    );
}
