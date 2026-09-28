import { getSession, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { todayLocal } from "@/lib/slots";

export async function GET() {
  try {
    const s = await getSession();
    const orgId = requireOrg(s);
    const today = todayLocal();
    const [todayCount, upcoming, cancelled, completed, doctors, patients, departments, handoffs] = await Promise.all([
      prisma.appointment.count({ where: { organizationId: orgId, date: today, status: { notIn: ["CANCELLED"] } } }),
      prisma.appointment.count({ where: { organizationId: orgId, date: { gt: today }, status: { notIn: ["CANCELLED"] } } }),
      prisma.appointment.count({ where: { organizationId: orgId, status: "CANCELLED" } }),
      prisma.appointment.count({ where: { organizationId: orgId, status: "COMPLETED" } }),
      prisma.doctor.count({ where: { organizationId: orgId } }),
      prisma.patient.count({ where: { organizationId: orgId } }),
      prisma.department.count({ where: { organizationId: orgId } }),
      prisma.conversation.count({ where: { organizationId: orgId, mode: "HUMAN", status: "OPEN" } }),
    ]);
    // revenue: completed appointments x consult fee
    const done = await prisma.appointment.findMany({ where: { organizationId: orgId, status: "COMPLETED" }, include: { doctor: true } });
    const revenue = done.reduce((sum, a) => sum + a.doctor.consultFee, 0);
    // last 7 days appointment volume
    const byDay: Record<string, number> = {};
    const recent = await prisma.appointment.findMany({ where: { organizationId: orgId, date: { gte: today } }, select: { date: true } });
    for (const a of recent) byDay[a.date] = (byDay[a.date] || 0) + 1;
    return json({ todayCount, upcoming, cancelled, completed, doctors, patients, departments, handoffs, revenue, byDay });
  } catch (e) { return fail(e); }
}
