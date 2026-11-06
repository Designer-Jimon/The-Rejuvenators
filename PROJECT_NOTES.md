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

## Performance and navigation
- Skeleton loading, per-request caches, sticky headers with safe-area spacing and route progress bar.

## Admin CMS (`/admin`)
- Media (R2), branding, slideshow, content, activities, departments (icons), worship centers, FAQ, social, sermons, devotionals, AI settings.
- Appointments at `/admin/appointments` (`appointment.manage`): decisions, notes, WhatsApp, availability.
- Events at `/admin/events`: centers, multi-day duration, sessions, live links, home popup, participating units, publish; new events notify members.
- Attendance at `/admin/attendance`: unit submissions/unlock, reports, CSV export, repeated-absence follow-ups and audit.
- Unit leaders mark locked attendance at `/member/leadership/[eventId]`; members see center-scoped events/stats at `/member/events`.
- Sermons/devotionals at `/admin/sermons` and `/admin/devotionals`; Super Admin `/admin/ai-settings`; cron `0 5 * * *` runs the daily devotional.

## Data and security
- Additive migrations: `0002_steady_mongoose.sql` (appointments), `0003_daffy_young_avengers.sql` (events/attendance/devotionals/sermons), `0004_glorious_maximus.sql` (centers/profile/event extras).
- Set `APP_URL` for absolute links. `OPENAI_API_KEY` is a Worker secret: `wrangler secret put OPENAI_API_KEY`; public R2 reads are limited to `media/`.
- State-changing APIs verify origin; admin/permission checks are server-side with audit logs. Verify: `npm run typecheck`, `npm run build`, `npm run test:security`, `npm run cf:build`.
