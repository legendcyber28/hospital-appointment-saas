import { getSession, requirePerm, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";

export async function GET() {
  try {
    const s = await getSession();
    await requirePerm(s, "DOCTOR_VIEW");
    const orgId = requireOrg(s);
    const departments = await prisma.department.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } });
    return json({ departments });
  } catch (e) { return fail(e); }
}
export async function POST(req: Request) {
  try {
    const s = await getSession();
    await requirePerm(s, "SETTINGS_MANAGE");
    const orgId = requireOrg(s);
    const { name } = await req.json();
    const department = await prisma.department.create({ data: { organizationId: orgId, name } });
    return json({ department }, 201);
  } catch (e) { return fail(e); }
}
