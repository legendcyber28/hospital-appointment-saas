import { getSession, requirePerm, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";

export async function GET() {
  try {
    const s = await getSession();
    await requirePerm(s, "WHATSAPP_VIEW");
    const orgId = requireOrg(s);
    const conversations = await prisma.conversation.findMany({
      where: { organizationId: orgId, status: "OPEN" },
      include: { patient: true, messages: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { messages: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return json({ conversations });
  } catch (e) { return fail(e); }
}
