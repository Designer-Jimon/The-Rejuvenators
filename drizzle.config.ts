import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:.wrangler/state/v3/d1/miniflare-D1DatabaseObject/local.db",
  },
});
