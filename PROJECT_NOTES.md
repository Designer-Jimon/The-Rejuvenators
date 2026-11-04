# IT IS FINISHED REVIVAL OUTREACH - Project Notes

## Phase 1 status

Phase 1 is implemented: public church website, member authentication and
platform, and the admin membership workflow.

The project is intentionally built so that church-specific facts are editable.
Placeholder values such as `[Church address - edit in Admin]` are seeded and must
be replaced in **Admin -> Site settings** before launch. No service times,
addresses, phone numbers or social links have been invented.

## Stack

- Next.js 15 App Router, React 19, TypeScript
- Tailwind CSS 3 with a burgundy/ember/cream church palette
- Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`)
- Cloudflare D1 database with Drizzle ORM
- Cloudflare R2 bucket for avatars, covers and media
- Custom session authentication (PBKDF2-SHA256, 210,000 iterations)
- Zod validation for all user and admin input
- PWA manifest, installable on mobile

## Local setup

```powershell
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The local app runs at `http://localhost:3000`.

### Local test accounts

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| Super Admin | `admin@example.com` | `ChangeMe123!` | Must change password on first login |
| Member | `member@example.com` | `Member123!` | Approved member in Worship Team |

The seed is idempotent. Change the local passwords in
`scripts/seed.mjs` or through the app if the seed values are unsuitable.

## Environment and bindings

`wrangler.jsonc` defines:

- D1 binding `DB`, database name `itisfinished-db`
- R2 binding `MEDIA`, bucket `itisfinished-media`
- Durable Object binding `REALTIME`, class `RealtimeRoom` (reserved for Phase 4)
- Cron trigger `0 7 * * *` (reserved for daily tasks)
- Asset binding `ASSETS`

Before deployment:

1. Create the D1 database and R2 bucket.
2. Replace the placeholder D1 `database_id` in `wrangler.jsonc`.
3. Update `APP_URL` and any production values in `wrangler.jsonc` or secrets.
4. Apply remote migrations with `npm run db:migrate:remote`.
5. Seed production with explicit credentials:
   `SEED_ADMIN_PASSWORD="..." npm run db:seed:remote`
6. Run `npm run cf:build` before `npm run deploy`.

Optional email variables are documented in `.env.example`. Email delivery is
not enabled in Phase 1; password reset links are returned in the UI only when
email is not configured, and are not sent.

## Authentication and security

- Session cookie: `iif_session`, HTTP-only, SameSite=Lax, Secure in production.
- Session tokens are stored as SHA-256 hashes in the `sessions` table.
- Passwords use PBKDF2-SHA256 with a random 16-byte salt and 210,000 iterations.
- Login, registration, password reset and API writes are rate limited.
- State-changing API routes verify the request `Origin`.
- Forced password change is enforced for seeded admin accounts.
- Role and permission checks happen on the server for every admin page and API
  action.
- Members cannot change their own department, registration status, membership
  status, roles, follow-up fields or member code through the profile API.
- All membership actions write to `audit_logs`.
- Uploaded images are type-checked, size-limited and stored in R2 under
  per-user keys. Media reads require an authenticated session in Phase 1.

### Security checks

```powershell
npm run test:security
```

The script starts a local dev server, creates a temporary member session and
verifies:

1. Anonymous admin API requests receive `401`.
2. A member calling an admin endpoint receives `403`.
3. A member attempting to change their own department receives `403`.
4. A normal profile update still returns `200`.

Verified locally: 4/4 checks passing.

## Data model

The Drizzle schema (`lib/db/schema.ts`) contains 35 tables covering all four
planned phases:

- Identity and access: `users`, `roles`, `permissions`, `role_permissions`,
  `user_roles`, `sessions`, `password_resets`, `rate_limits`
- Membership: `departments`, `member_profiles`, `department_members`,
  `department_leaders`
- Church content: `site_settings`, `content_blocks`, `slideshow_images`,
  `activities`, `faqs`, `media_library`, `events`, `event_departments`,
  `sermons`, `devotional_plans`, `devotionals`
- Attendance: `attendance_records`, `attendance_submissions`, `attendance_audit`
- Communication: `notifications`, `notification_preferences`, `conversations`,
  `conversation_participants`, `messages`, `message_reads`, `appointments`
- Future AI settings: `ai_settings`
- Governance: `audit_logs`

Only Phase 1 features are exposed in the UI. Other tables are reserved so later
phases do not require destructive schema changes.

The initial migration is `drizzle/0000_overconfident_sersi.sql`.

## Roles and permissions

Roles:

- `super_admin` - all permissions
- `membership_admin` - admin access, registration review, member management,
  leadership, follow-up, WhatsApp invites, directory
- `content_admin` - admin access, content management, site settings, directory
- `unit_leader` - directory access
- `member` - directory access

The admin navigation hides sections the signed-in user cannot manage. Admin
overview shows membership data only to users with `member.review`.

## Registration and membership workflow

1. A visitor registers with name, email, phone, password, department interest
   and optional profile details.
2. A member account and profile are created with status `pending`.
3. The `member` role is assigned.
4. Users with `member.review` receive the notification:
   `A new member has registered with IT IS FINISHED REVIVAL OUTREACH and has expressed interest in serving God through the [Department Name] Department.`
5. A membership admin reviews the record at `Admin -> Members`.
6. Admin actions can:
   - approve registration (activates membership and adds the requested department)
   - reject registration
   - assign or change department
   - assign or remove unit leader
   - activate or deactivate membership
   - update follow-up status and internal notes
   - prepare a WhatsApp group invite
7. Decisions and changes notify the member in-app and are written to the audit
   log.

Members see a pending banner until approved and can complete their profile while
waiting.

## Main routes

Public:

- `/` home
- `/about`
- `/departments`
- `/events`
- `/sermons`
- `/contact`

Auth:

- `/register`
- `/login`
- `/forgot-password`
- `/reset-password`
- `/change-password`

Member:

- `/member` dashboard
- `/member/profile`
- `/member/directory`
- `/member/notifications`
- `/member/settings`

Admin:

- `/admin` overview
- `/admin/members`
- `/admin/members/[id]`
- `/admin/settings`

API:

- `POST /api/auth/register`
- `POST /api/auth/logout`
- `PATCH /api/member/profile`
- `POST /api/member/media`
- `PATCH /api/admin/members/[id]`
- `GET /api/media/[...key]`

## Mobile-first implementation

- Layouts target a 360px viewport first.
- Primary touch targets are at least 44px.
- Body text is 16px, with 16px form controls to avoid mobile zoom.
- Member navigation uses a fixed bottom tab bar with safe-area padding.
- Admin navigation uses a drawer on mobile and a sidebar on desktop.
- Tables switch to stacked cards below the `md` breakpoint.
- Forms are single-column on mobile.
- Dialogs become bottom sheets on small screens.
- Visible focus states and reduced-motion support are included.

## Commands

```powershell
npm run dev            # local development
npm run build          # production build
npm run typecheck      # TypeScript validation
npm run test:security  # live authorization checks
npm run db:generate    # generate a new Drizzle migration
npm run db:migrate     # apply migrations locally
npm run db:seed        # seed local data
npm run db:migrate:remote
npm run db:seed:remote
npm run cf:build       # OpenNext Cloudflare build
npm run deploy
```

`next lint` is not configured with an ESLint dependency yet, so builds skip
ESLint. TypeScript and the production build are the current gates.

## Verification completed

- `npm run db:migrate`: initial migration applied locally (67 statements).
- `npm run db:seed`: 72 statements executed successfully.
- `npm run typecheck`: passed.
- Production build: passed; route table generated for all public, auth, member,
  admin and API routes.
- `npm run test:security`: 4/4 checks passed.

Build notes:

- Google-hosted fonts were removed in favour of system font stacks so builds do
  not depend on external network access.
- `outputFileTracingRoot` is pinned to the project directory to avoid tracing
  unrelated parent directories.
- OpenNext dev initialization runs only in development, not during builds.
- The `worker.ts` import of `.open-next/worker.js` is generated by the OpenNext
  build; it is intentionally ignored by TypeScript.

## Phase 1 limitations / follow-up

- Email and WhatsApp delivery are not configured. Notifications are in-app only.
- Attendance, events, sermons, devotionals, messaging, appointments and AI
  settings exist in the database but have no management UI yet.
- Content admin tools beyond site settings are reserved for later phases.
- The R2 bucket and D1 database must be created and bound for deployment.
- The D1 `database_id` placeholder must be replaced before remote use.
- A production admin password must be supplied explicitly when remote seeding.
- ESLint is not installed or configured.

## Next phase candidate work

- Content management for events, sermons, activities, FAQs, slideshow and media.
- Attendance recording and department submissions.
- Member messaging and appointments.
- Devotionals and AI-assisted content tools after the core church workflow is
  stable.
- Email/WhatsApp notification delivery and scheduled reminders.
