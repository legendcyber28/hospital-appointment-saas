import { getSession, requirePerm } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { todayLocal } from "@/lib/slots";

export async function GET() {
  try {
    const s = await getSession();
    await requirePerm(s, "PLATFORM_VIEW");
    const [orgs, activeOrgs, suspended, doctors, patients, appts, apptsToday, waConnected] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: "ACTIVE" } }),
      prisma.organization.count({ where: { status: "SUSPENDED" } }),
      prisma.doctor.count(),
      prisma.patient.count(),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { date: todayLocal() } }),
      prisma.whatsAppAccount.count(),
    ]);
    const plans = await prisma.plan.findMany({ include: { _count: { select: { organizations: true } } } });
    const revenue = plans.reduce((sum, p) => sum + p._count.organizations * p.priceMonthly, 0);
    return json({ orgs, activeOrgs, suspended, doctors, patients, appts, apptsToday, waConnected, monthlyRevenue: revenue, plans });
  } catch (e) { return fail(e); }
}
