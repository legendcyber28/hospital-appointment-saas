# SwasthBook - Multi-tenant Hospital & Clinic Appointment SaaS (Mini v1)

WhatsApp-first appointment platform. One deployment serves many hospitals/clinics
(tenants) with full data isolation, role-based access, subscription plan limits,
and an AI-style WhatsApp booking flow (demo mode included).

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM, SQLite for local demo (switch provider to postgresql + DATABASE_URL for production)
- JWT session in httpOnly cookie (jose), bcryptjs password hashing

## Setup
```bash
npm install
cp .env.example .env        # set AUTH_SECRET
npm run db:push
npm run db:seed
npm run build && npm start  # http://localhost:3000
```

## Demo credentials (seeded)
| Role | Login | Password |
|---|---|---|
| Platform Super Admin | owner@platform.com | admin123 |
| ABC Hospital Admin | admin@abc.com | demo123 |
| ABC Receptionist | reception@abc.com | demo123 |
| ABC Doctor | dr.sharma@abc.com / dr.verma@abc.com | demo123 |
| XYZ Clinic Admin (isolation test) | admin@xyz.com | demo123 |

## What is in the mini version
- Multi-tenant schema: Organization, Branch, User, Role, Permission, Department,
  Doctor, DoctorSchedule, DoctorLeave, Patient, Appointment, Conversation,
  ConversationMessage, WhatsAppAccount, Plan, AuditLog
- RBAC: permissions separate from roles; preset roles SUPER_ADMIN,
  ORGANIZATION_ADMIN, DOCTOR, RECEPTIONIST, STAFF
- Tenant isolation: every org query is scoped server-side from the session,
  never from client input
- Appointment engine: slots generated from weekly schedule + breaks + leaves;
  booked slots disappear; past slots hidden; double booking blocked in a
  DB transaction
- Lifecycle: PENDING / CONFIRMED / CHECKED_IN / COMPLETED / CANCELLED / NO_SHOW
- Dashboards: Super Admin (platform stats, create org + admin, suspend/activate),
  Org Admin (today, upcoming, revenue, handoffs), Doctor (own patients,
  check-in/complete/no-show), Receptionist (book/cancel/check-in)
- WhatsApp demo mode (/demo): Hinglish conversation - department detection,
  doctor list with real fees, real slot list, booking confirmation, cancel and
  reschedule flows, "human se baat karni hai" handoff. Staff inbox (/app/inbox)
  with take over / reply / return to AI.
- Public booking page per org: /book/<slug>
- Subscription plans with enforced limits (doctors, branches) - editing plans
  is data, not code
- Audit log on create/update/status actions

## Demo mode vs live
WhatsApp and payments run in DEMO mode. Nothing is faked as live: the WhatsApp
account record says mode=DEMO. To go live, set WHATSAPP_MODE=live and provide
WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_VERIFY_TOKEN, then
point the Cloud API webhook at /api/chat (org resolved from the receiving
business number).

## Tenant isolation test
Login as admin@xyz.com - sees zero ABC data; API calls with ABC ids return 404.
Login as owner@platform.com - sees both orgs, plans, revenue.

## Not in mini (next phases)
Razorpay live billing, onboarding wizard, custom roles UI, OTP login for
patients, white-label domains, charts, notifications/reminders, LLM-based AI
(current demo AI is a deterministic state machine - it can never invent
doctors/fees/slots, which is the safe default for a sellable demo).

## Security checklist
- [x] Passwords hashed (bcrypt)
- [x] Sessions httpOnly JWT, 7-day expiry
- [x] Server-side tenant scoping on every org query
- [x] Permission checks on every mutating API
- [x] No secrets in frontend; .env gitignored
- [x] Audit log for admin actions
- [ ] Rate limiting + CAPTCHA on public booking (pre-launch)
- [ ] HTTPS + secure cookies (set cookie.secure when behind TLS)
- [ ] Postgres + migrations for production

## Production notes
The repo uses Postgres (Render free tier via render.yaml: `npm install && prisma db push && seed && build`).
For a zero-setup local run without Postgres, switch prisma/schema.prisma provider to "sqlite" and set DATABASE_URL="file:./dev.db".
