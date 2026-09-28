import { getSession, requirePerm, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await getSession();
    await requirePerm(s, "DOCTOR_EDIT");
    const orgId = requireOrg(s);
    const body = await req.json();
    const old = await prisma.doctor.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!old) return json({ error: "not found" }, 404);
    const data: Record<string, unknown> = {};
    for (const k of ["name", "qualification", "specialization", "status", "branchId", "departmentId"]) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    for (const k of ["consultFee", "followUpFee", "slotDurationMin", "experienceYears"]) {
      if (body[k] !== undefined) data[k] = Number(body[k]);
    }
    const doctor = await prisma.doctor.update({ where: { id: params.id }, data });
    await audit({ organizationId: orgId, userId: s!.uid, action: "DOCTOR_UPDATE", resource: "Doctor", resourceId: doctor.id, oldValue: old, newValue: data });
    return json({ doctor });
  } catch (e) { return fail(e); }
}
