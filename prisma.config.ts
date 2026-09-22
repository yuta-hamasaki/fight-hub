import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";
// Respect injected deployment/test variables; local overrides mirror Next.js.
if (process.env.DOTENV_CONFIG_PATH)
  config({ path: process.env.DOTENV_CONFIG_PATH, quiet: true });
else {
  config({ path: ".env.local", quiet: true });
  config({ quiet: true });
}
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "node prisma/seed.mjs" },
  datasource: { url: process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL") },
});
