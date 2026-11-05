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
- Home, About, Vision & Mission, Activities, Departments + detail, FAQ, Contact.
- Appointments at `/appointments`: guest/member request form, available slots, confirmation receipt.
- Hero text/buttons, content blocks, department photos/leaders, FAQ, contact/social and logo are database-driven.
- CMS saves revalidate public pages immediately via `revalidatePath`.

## Performance and navigation
- `loading.tsx` skeletons; per-request caches for settings, content, nav and logo.
- Sticky public/member/admin headers with safe-area padding and scroll shadow.
- `next/link` prefetch, pressed feedback, top route progress bar, mobile route-close menus.
- Below-fold `content-visibility`; slideshow images use `next/image` with first-slide priority.

## Admin CMS (`/admin`)
- Media Library (R2), Logo & Branding, Slideshow, Website Content, Activities, Departments, FAQ, Social & Contact.
- Appointments at `/admin/appointments`: approve/decline/suggest/complete, notes, WhatsApp, availability.
- Requires `appointment.manage` for appointments; content/settings permissions remain enforced with audit logs.

## Data and security
- Migration `0002_steady_mongoose.sql` adds appointment fields/indexes and seeds appointment settings/permission.
- Public R2 reads limited to `media/`; state-changing APIs verify origin; admin checks run server-side.
- Verify: `npm run typecheck`, `npm run build`, `npm run test:security`, `npm run cf:build`.
