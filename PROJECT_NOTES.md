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
- Hero text/buttons, content blocks, activities, department photos/leaders, FAQ, contact/social and logo are database-driven.
- CMS saves revalidate public pages immediately.

## Admin CMS (`/admin`)
- Media Library: R2 uploads, client compression, alt text, delete, reusable image picker.
- Logo & Branding: logo powers site logo, favicon and PWA icons via `/api/branding/logo` and `/api/manifest`.
- Slideshow: upload, caption, active toggle, reorder, delete.
- Screens: Website Content, Activities, Departments, FAQ, Social & Contact.
- Enforces `content.manage` / `settings.manage`, writes audit logs, uses mobile cards and single-column forms.

## Data and security
- Migration `0001_cuddly_carmella_unuscione.sql` adds CMS fields and backfills seeded activity schedules.
- Public R2 reads are limited to `media/`; other media remains authenticated.
- State-changing APIs verify origin; admin checks run on the server.

## Commands and verification
- `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`.
- `npm run typecheck`, `npm run build`, `npm run test:security`, `npm run cf:build`.
- Verification pending; fix any type/build errors before deploy.
