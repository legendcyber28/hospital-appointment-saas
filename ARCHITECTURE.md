# Architecture (Mini v1)

                PATIENT
                   │
        WhatsApp (DEMO chat / Cloud API webhook)
                   │
                   ▼
            POST /api/chat  ── resolves org from slug (demo) or business number (live)
                   │
                   ▼
          Conversation Engine (demo-ai.ts state machine)
                   │  never invents data; reads/writes only via these services:
          ┌────────┼─────────────┐
          ▼        ▼             ▼
     Doctor/dept  Slot engine   Patient service
     search       (slots.ts)    (auto-create by WhatsApp no.)
          │        │            │
          └────────┼────────────┘
                   ▼
          Appointment Engine (transactional, no double booking)
                   │
                   ▼
               Database (SQLite dev / Postgres prod, Prisma)
                   │
   ┌───────────────┼────────────────────┐
   ▼               ▼                    ▼
/app (org admin  /doctor (doctor      /platform (SUPER ADMIN:
 + receptionist)  dashboard)           orgs, plans, suspend)

## Multi-tenancy model
Shared database, shared schema, `organizationId` column on every tenant table.
The tenant id comes from the authenticated session (or, for WhatsApp, from the
receiving business number) - never from client input. Every repository call
filters on it; cross-tenant ids return 404.

## RBAC model
Permission rows (DOCTOR_VIEW, APPOINTMENT_CREATE, ...) are assigned to Roles
via RolePermission; Users get Roles via UserRole. Role presets seeded per org;
custom roles = new Role + chosen permissions.

## Slot engine
DoctorSchedule(dayOfWeek, start, end, break?) + slotDurationMin - breaks -
DoctorLeave - booked(non-cancelled) - past-today = available slots.
Booking runs in a transaction that re-counts the slot; second writer gets
SLOT_TAKEN (HTTP 409).

## WhatsApp human handoff
Conversation.mode: AI | HUMAN. Patient says "human se baat karni hai" ->
HUMAN, AI goes silent, conversation flagged in staff inbox. Staff replies as
STAFF; "Return to AI" restores the bot.
