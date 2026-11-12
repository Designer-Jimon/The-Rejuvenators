# IT IS FINISHED REVIVAL OUTREACH - Project Notes
## Stack
- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 3.
- Cloudflare Workers via OpenNext, D1 with Drizzle ORM, R2 media storage.
- Custom session auth, Zod validation, server-side permissions, audit logs; mobile-first PWA UI.
## Local setup
```powershell
npm install
npm run db:migrate
npm run db:seed
npm run dev
```
- Admin: `http://localhost:3000/admin`; Super Admin: `admin@example.com` / `ChangeMe123!`; Member: `member@example.com` / `Member123!`.
- Seed is idempotent. Replace `[Church ... - edit in Admin]` placeholders before launch.
## Public site
- Home, About, Vision & Mission, Activities, Departments, Worship Centers, FAQ, Contact, Events, Sermons, Daily Meal + detail (share and PDF download).
- Appointments at `/appointments`: guest/member request form, available slots, confirmation receipt.
- Hero, content blocks, department photos/icons/leaders, FAQ, social and logo are database-driven; `revalidatePath` updates pages.
## Chat and realtime
- Member chat at `/member/chat`: direct messages, center-scoped department groups, All Centers announcements, unread badges, attachments, replies, reporting and delete.
- Messages persist through D1 APIs; the `RealtimeRoom` Durable Object only fans out WebSocket events. The client keeps a 15-second polling fallback.
- Department/center groups sync on approval, department or center changes, leader changes, status changes and profile edits; deactivated departments/centers archive groups.
- Moderation at `/admin/chat-moderation`: reports, message removal, temporary mutes, group archive/restore; audited.
- Announcement replies and group visibility are controlled on `/admin/settings`; attendance follow-ups create private messages.
## Locations
- Bundled `data/locations/countries.json` (250 countries), `states-by-country.json` and `nigeria-lgas.json` (37 states / 774 LGAs).
- Registration/profile editing use searchable country/state/LGA pickers; missing state data falls back to free text. Validate with `npm run test:locations`.
## Admin and UX
- Media, branding, slideshow, website text, pastor profile, activities, departments, worship centers, FAQ, social, sermons, Daily Meal, AI settings.
- Website text edits Home/About/Vision/Contact/Footer in one validated form; Pastor edits name, title, bio, about, quote and photo.
- Daily Meal at `/devotionals`: AI quick post, draft generation from a sermon, review/edit, approve, schedule, archive/restore, notify/home toggles, member dashboard card, public sharing and PDF download. Scheduled meals publish at 6:00 AM Africa/Lagos; cron runs every 15 minutes and only acts after the 6 AM gate.
- Events, attendance, appointments, unit-leader attendance and center-scoped member events as before.
- Grouped collapsible admin navigation, mobile drawers and member account menu; skeleton loading, sticky safe-area headers, 44px+ targets and no horizontal scroll.
## Data and security
- Migrations: `0005_freezing_lady_vermin.sql` (chat), `0006_brief_menace.sql` (center chat, archive, mutes, reports), `0007_conscious_trauma.sql` (Daily Meal notify/home/archive columns).
- Set `APP_URL` for absolute links and password reset emails. `RESEND_API_KEY` plus `EMAIL_FROM` enable transactional email; without a key, development reset links are logged to the console. `OPENAI_API_KEY` is a Worker secret: `wrangler secret put OPENAI_API_KEY`; public R2 reads are limited to `media/`.
- State-changing APIs verify origin; admin/permission checks are server-side with audit logs. CSP, HSTS, frame and permissions headers are set in `next.config.ts`.
- Chat rate limits: create conversation 20/min, send message 40/min, upload 10/min. Uploads allow images, PDF, Word, Excel, text, CSV and ZIP up to 10MB.
- Verify: `npm run typecheck`, `npm run build`, `npm run test:security`, `npm run test:locations`, `npm run cf:build`.
## Launch checklist
- Replace seed placeholders, set `APP_URL`, add `RESEND_API_KEY`, `EMAIL_FROM` and `OPENAI_API_KEY`, run `npm run db:migrate:remote` (includes `0007_conscious_trauma.sql`) and `npm run db:seed:remote`; change seeded passwords, test password reset, Daily Meal PDF/share and branding/logo, test chat on a real phone, and confirm the Daily Meal cron time (6:00 AM Lagos) with attendance follow-ups.

## Recent changes (2026-11-12)
- Locations: countries stay bundled; state/LGA lists lazy-load by country. Pickers use a mobile bottom sheet and desktop popover. Nigeria state/LGA values are validated server-side; other countries fall back to text. Admin member list shows country/state/LGA.
- Seed: remote seeding now requires a real `SEED_ADMIN_EMAIL` (not `@example.com`), skips the test member and transaction wrapper, and deletes the generated temporary SQL file.
- Daily Meal cron: checks the plan date window, AI key, existing day, and stops automatic generation after 3 failures per plan/day. Manual runs still retry. Admin shows failed-today count and the last failure.
- Email: registration and profile-update confirmations added. Missing `RESEND_API_KEY` logs a clear warning; API/network failures are caught so registrations and profile updates still succeed. `wrangler.jsonc` now has `APP_URL` and `EMAIL_FROM` placeholders.
- Lint note: `npm run lint` is not configured (no ESLint dependency/config); `next lint` prompts interactively. Typecheck passes.
