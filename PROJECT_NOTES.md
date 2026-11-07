# IT IS FINISHED REVIVAL OUTREACH - Project Notes
## Stack
- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 3.
- Cloudflare Workers via OpenNext, D1 with Drizzle ORM, R2 media storage.
- Custom session auth, Zod validation, server-side permissions, audit logs.
- Mobile-first public/admin UI; PWA manifest supports install.

## Local setup
```powershell
npm install
npm run db:migrate
npm run db:seed
npm run dev
```
- Admin: `http://localhost:3000/admin`
- Super Admin: `admin@example.com` / `ChangeMe123!` (change on first login)
- Member: `member@example.com` / `Member123!`
- Seed is idempotent. Replace `[Church ... - edit in Admin]` placeholders before launch.

## Public site
- Home, About, Vision & Mission, Activities, Departments, Worship Centers, FAQ, Contact, Events, Sermons, Devotionals + detail.
- Appointments at `/appointments`: guest/member request form, available slots, confirmation receipt.
- Hero, content blocks, department photos/icons/leaders, FAQ, social and logo are database-driven; `revalidatePath` updates pages.

## Chat and realtime
- Member chat at `/member/chat`: direct messages, department groups, unread badges, attachments, replies, reporting and delete.
- Messages persist through D1 APIs; the `RealtimeRoom` Durable Object only fans out WebSocket events. The client keeps a 15-second polling fallback.
- Department groups sync when members are approved, reassigned, made/removed as leaders, deactivated or rejected.
- Attendance follow-ups create a private chat message and link the notification to the conversation.
- Direct-message and mention notifications are throttled after 3 unread messages in a conversation.

## Locations
- Bundled `data/locations/countries.json` (250 countries), `states-by-country.json` and `nigeria-lgas.json` (37 states / 774 LGAs).
- Registration and profile editing use searchable country/state/LGA pickers. Countries without state data fall back to free text.
- Validate with `npm run test:locations`.

## Performance and navigation
- Skeleton loading, per-request caches, sticky headers with safe-area spacing and route progress bar.
- Admin session, settings, role/permission and dashboard count queries run in parallel; admin routes have an error boundary.

## Admin CMS (`/admin`)
- Media (R2), branding, slideshow, content, activities, departments (icons), worship centers, FAQ, social, sermons, devotionals, AI settings.
- Appointments at `/admin/appointments` (`appointment.manage`): decisions, notes, WhatsApp, availability.
- Events at `/admin/events`: centers, multi-day duration, sessions, live links, home popup, participating units, publish; new events notify members.
- Attendance at `/admin/attendance`: unit submissions/unlock, reports, CSV export, repeated-absence follow-ups and audit.
- Unit leaders mark locked attendance at `/member/leadership/[eventId]`; members see center-scoped events/stats at `/member/events`.
- Sermons/devotionals at `/admin/sermons` and `/admin/devotionals`; Super Admin `/admin/ai-settings`; cron `0 5 * * *` runs the daily devotional.

## Data and security
- Additive migrations: `0002_steady_mongoose.sql` (appointments), `0003_daffy_young_avengers.sql` (events/attendance/devotionals/sermons), `0004_glorious_maximus.sql` (centers/profile/event extras), `0005_freezing_lady_vermin.sql` (chat).
- Set `APP_URL` for absolute links. `OPENAI_API_KEY` is a Worker secret: `wrangler secret put OPENAI_API_KEY`; public R2 reads are limited to `media/`.
- The `REALTIME` Durable Object binding and `v1` migration are in `wrangler.jsonc`.
- State-changing APIs verify origin; admin/permission checks are server-side with audit logs. CSP, HSTS, frame and permissions headers are set in `next.config.ts`.
- Chat rate limits: create conversation 20/min, send message 40/min, upload 10/min. Chat uploads allow images, PDF, Word, Excel, text, CSV and ZIP up to 10MB.
- Verify: `npm run typecheck`, `npm run build`, `npm run test:security`, `npm run test:locations`, `npm run cf:build`.

## Launch checklist
- Replace seed placeholders, set `APP_URL`, add `OPENAI_API_KEY`, run `npm run db:migrate:remote` and `npm run db:seed:remote`.
- Change seeded passwords, confirm admin branding/logo loads without redirects, and test chat on a real phone (including WebSocket fallback).
- Confirm cron devotional time (5:00 AM Lagos) and attendance follow-up chat delivery.
