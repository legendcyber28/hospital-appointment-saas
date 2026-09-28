import { getSession, requirePerm, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const s = await getSession();
    await requirePerm(s, "PATIENT_VIEW");
    const orgId = requireOrg(s);
    const q = new URL(req.url).searchParams.get("q") || "";
    const patients = await prisma.patient.findMany({
      where: { organizationId: orgId, OR: [{ name: { contains: q } }, { whatsappNumber: { contains: q } }] },
      include: { _count: { select: { appointments: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return json({ patients });
  } catch (e) { return fail(e); }
}
