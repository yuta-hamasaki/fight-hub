import { describe, expect, it } from "vitest";
import { validateProductionEnvironment } from "../../scripts/check-production.mjs";

const configured = () => ({
  DATABASE_URL: "postgresql://user:password@db.example.com/app",
  NEXT_PUBLIC_APP_URL: "https://example.com",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_example",
  CLERK_SECRET_KEY: "sk_live_example",
  STRIPE_SECRET_KEY: "sk_live_example",
  STRIPE_WEBHOOK_SECRET: "whsec_payments",
  STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_connect",
  CRON_SECRET: "a".repeat(32),
  SUPPORT_EMAIL: "support@example.com",
});

describe("production environment checks", () => {
  it("accepts a complete live configuration", () => {
    expect(validateProductionEnvironment(configured())).toEqual([]);
  });
  it("reports missing variables by name without printing secrets", () => {
    const env = configured();
    env.STRIPE_CONNECT_WEBHOOK_SECRET = "";
    env.STRIPE_SECRET_KEY = "sk_test_private-value";
    const result = validateProductionEnvironment(env).join("\n");
    expect(result).toContain("STRIPE_CONNECT_WEBHOOK_SECRET");
    expect(result).toContain("STRIPE_SECRET_KEY");
    expect(result).not.toContain("private-value");
  });
  it.each([
    "http://example.com",
    "https://localhost",
    "https://example.com/path",
    "https://example.com?redirect=other",
    "https://user:password@example.com",
    "invalid",
  ])("rejects unsuitable app origin %s", (url) => {
    expect(
      validateProductionEnvironment({
        ...configured(),
        NEXT_PUBLIC_APP_URL: url,
      }).join(),
    ).toContain("NEXT_PUBLIC_APP_URL");
  });
  it("rejects weak cron secrets and invalid support addresses", () => {
    const result = validateProductionEnvironment({
      ...configured(),
      CRON_SECRET: "short",
      SUPPORT_EMAIL: "invalid",
    }).join();
    expect(result).toContain("CRON_SECRET");
    expect(result).toContain("SUPPORT_EMAIL");
  });
});
