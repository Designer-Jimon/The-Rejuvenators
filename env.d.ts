import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    MEDIA: R2Bucket;
    ASSETS?: Fetcher;
    NEXTJS_ENV?: string;
    APP_NAME?: string;
    APP_URL?: string;
    SEED_ADMIN_NAME?: string;
    SEED_ADMIN_EMAIL?: string;
    SEED_ADMIN_PASSWORD?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    OPENAI_API_KEY?: string;
  }
}

export {};
