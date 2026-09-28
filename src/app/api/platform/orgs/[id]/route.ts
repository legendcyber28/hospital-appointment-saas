import { getSession, requirePerm } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await getSession();
    await requirePerm(s, "ORG_MANAGE");
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const k of ["status", "planId", "subscriptionStatus", "name", "phone", "email", "city", "whatsappNumber"]) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    const old = await prisma.organization.findUnique({ where: { id: params.id } });
    const org = await prisma.organization.update({ where: { id: params.id }, data });
    await audit({ userId: s!.uid, action: "ORG_UPDATE", resource: "Organization", resourceId: org.id, oldValue: old, newValue: data });
    return json({ org });
  } catch (e) { return fail(e); }
}
