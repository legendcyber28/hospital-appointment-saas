import { getSession, requirePerm, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";

export async function GET() {
  try {
    const s = await getSession();
    if (!s?.orgId) return json({ error: "no org" }, 401);
    const branches = await prisma.branch.findMany({ where: { organizationId: s.orgId } });
    return json({ branches });
  } catch (e) { return fail(e); }
}
export async function POST(req: Request) {
  try {
    const s = await getSession();
    await requirePerm(s, "SETTINGS_MANAGE");
    const orgId = requireOrg(s);
    const org = await prisma.organization.findUnique({ where: { id: orgId }, include: { plan: true, _count: { select: { branches: true } } } });
    if (org?.plan && org._count.branches >= org.plan.maxBranches) {
      return json({ error: `Branch limit reached (${org.plan.maxBranches}). Please upgrade your plan.` }, 402);
    }
    const { name, address, city } = await req.json();
    const branch = await prisma.branch.create({ data: { organizationId: orgId, name, address, city } });
    return json({ branch }, 201);
  } catch (e) { return fail(e); }
}
