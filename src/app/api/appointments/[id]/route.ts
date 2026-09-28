import { getSession, requirePerm, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { audit } from "@/lib/audit";

const ACTION_PERM: Record<string, string> = {
  CONFIRMED: "APPOINTMENT_EDIT", CHECKED_IN: "APPOINTMENT_EDIT", COMPLETED: "APPOINTMENT_EDIT",
  CANCELLED: "APPOINTMENT_CANCEL", NO_SHOW: "APPOINTMENT_EDIT",
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await getSession();
    const orgId = requireOrg(s);
    const body = await req.json();
    const old = await prisma.appointment.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!old) return json({ error: "not found" }, 404);

    if (body.status) {
      await requirePerm(s, ACTION_PERM[body.status] || "APPOINTMENT_EDIT");
      // a doctor can only change his own appointments
      const myDoc = await prisma.doctor.findFirst({ where: { userId: s!.uid, organizationId: orgId } });
      if (myDoc && !s!.roles.includes("ORGANIZATION_ADMIN") && !s!.roles.includes("RECEPTIONIST") && old.doctorId !== myDoc.id) {
        return json({ error: "Not your appointment" }, 403);
      }
      const appt = await prisma.appointment.update({ where: { id: old.id }, data: { status: body.status } });
      await audit({ organizationId: orgId, userId: s!.uid, action: `APPOINTMENT_${body.status}`, resource: "Appointment", resourceId: appt.id, oldValue: { status: old.status }, newValue: { status: appt.status } });
      return json({ appointment: appt });
    }

    if (body.date && body.startTime) {
      await requirePerm(s, "APPOINTMENT_RESCHEDULE");
      const clash = await prisma.appointment.count({
        where: { doctorId: old.doctorId, date: body.date, startTime: body.startTime, status: { notIn: ["CANCELLED"] }, id: { not: old.id } },
      });
      if (clash) return json({ error: "SLOT_TAKEN" }, 409);
      const appt = await prisma.appointment.update({ where: { id: old.id }, data: { date: body.date, startTime: body.startTime } });
      await audit({ organizationId: orgId, userId: s!.uid, action: "APPOINTMENT_RESCHEDULE", resource: "Appointment", resourceId: appt.id, oldValue: { date: old.date, startTime: old.startTime }, newValue: { date: appt.date, startTime: appt.startTime } });
      return json({ appointment: appt });
    }
    return json({ error: "nothing to update" }, 400);
  } catch (e) { return fail(e); }
}
