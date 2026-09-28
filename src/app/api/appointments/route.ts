import { getSession, requirePerm, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { audit } from "@/lib/audit";
import { bookAppointment } from "@/lib/slots";

export async function GET(req: Request) {
  try {
    const s = await getSession();
    await requirePerm(s, "APPOINTMENT_VIEW");
    const orgId = requireOrg(s);
    const u = new URL(req.url);
    const date = u.searchParams.get("date");
    const doctorId = u.searchParams.get("doctorId");
    const status = u.searchParams.get("status");
    const where: Record<string, unknown> = { organizationId: orgId };
    // doctors only see their own appointments unless they have org-wide view via APPOINTMENT_EDIT + DOCTOR role is org-scoped;
    // mini rule: if the user has a doctor profile, scope to it.
    const me = await prisma.doctor.findFirst({ where: { userId: s!.uid, organizationId: orgId } });
    if (me && !s!.roles.includes("ORGANIZATION_ADMIN") && !s!.roles.includes("RECEPTIONIST")) where.doctorId = me.id;
    else if (doctorId) where.doctorId = doctorId;
    if (date) where.date = date;
    if (status) where.status = status;
    const appointments = await prisma.appointment.findMany({
      where, include: { doctor: true, patient: true, branch: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }], take: 200,
    });
    return json({ appointments });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const s = await getSession();
    await requirePerm(s, "APPOINTMENT_CREATE");
    const orgId = requireOrg(s);
    const body = await req.json();
    const doctor = await prisma.doctor.findFirst({ where: { id: body.doctorId, organizationId: orgId } });
    if (!doctor) return json({ error: "doctor not found" }, 404);
    let patientId = body.patientId as string | undefined;
    if (!patientId) {
      if (!body.patientPhone || !body.patientName) return json({ error: "patientName and patientPhone required" }, 400);
      const patient = await prisma.patient.upsert({
        where: { organizationId_whatsappNumber: { organizationId: orgId, whatsappNumber: body.patientPhone } },
        update: { name: body.patientName },
        create: { organizationId: orgId, name: body.patientName, whatsappNumber: body.patientPhone },
      });
      patientId = patient.id;
    }
    const appt = await bookAppointment({
      organizationId: orgId, branchId: doctor.branchId, doctorId: doctor.id,
      patientId, date: body.date, startTime: body.startTime, source: "STAFF", reason: body.reason,
    });
    await audit({ organizationId: orgId, userId: s!.uid, action: "APPOINTMENT_CREATE", resource: "Appointment", resourceId: appt.id, newValue: { date: appt.date, startTime: appt.startTime } });
    return json({ appointment: appt }, 201);
  } catch (e) { return fail(e); }
}
