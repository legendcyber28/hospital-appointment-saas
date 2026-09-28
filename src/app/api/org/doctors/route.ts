import { getSession, requirePerm, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    const s = await getSession();
    await requirePerm(s, "DOCTOR_VIEW");
    const orgId = requireOrg(s);
    const doctors = await prisma.doctor.findMany({
      where: { organizationId: orgId },
      include: { department: true, branch: true, schedules: true, leaves: true },
      orderBy: { name: "asc" },
    });
    return json({ doctors });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const s = await getSession();
    await requirePerm(s, "DOCTOR_CREATE");
    const orgId = requireOrg(s);
    const body = await req.json();
    // subscription limit enforcement
    const org = await prisma.organization.findUnique({ where: { id: orgId }, include: { plan: true, _count: { select: { doctors: true } } } });
    if (org?.plan && org._count.doctors >= org.plan.maxDoctors) {
      return json({ error: `Doctor limit reached (${org.plan.maxDoctors}). Please upgrade your plan.` }, 402);
    }
    const doctor = await prisma.doctor.create({
      data: {
        organizationId: orgId, branchId: body.branchId || null, departmentId: body.departmentId || null,
        name: body.name, qualification: body.qualification, specialization: body.specialization,
        registrationNo: body.registrationNo, experienceYears: body.experienceYears ? Number(body.experienceYears) : null,
        consultFee: Number(body.consultFee || 0), followUpFee: Number(body.followUpFee || 0),
        slotDurationMin: Number(body.slotDurationMin || 30),
      },
    });
    await audit({ organizationId: orgId, userId: s!.uid, action: "DOCTOR_CREATE", resource: "Doctor", resourceId: doctor.id, newValue: { name: doctor.name } });
    return json({ doctor }, 201);
  } catch (e) { return fail(e); }
}
