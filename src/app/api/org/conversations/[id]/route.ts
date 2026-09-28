import { getSession, requirePerm, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await getSession();
    await requirePerm(s, "WHATSAPP_VIEW");
    const orgId = requireOrg(s);
    const conv = await prisma.conversation.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: { messages: { orderBy: { createdAt: "asc" } }, patient: true },
    });
    if (!conv) return json({ error: "not found" }, 404);
    return json({ conversation: conv });
  } catch (e) { return fail(e); }
}

// POST { action: "takeover" | "release" | "reply" | "close", body? }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await getSession();
    await requirePerm(s, "WHATSAPP_MANAGE");
    const orgId = requireOrg(s);
    const conv = await prisma.conversation.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!conv) return json({ error: "not found" }, 404);
    const { action, body } = await req.json();
    if (action === "takeover") {
      await prisma.conversation.update({ where: { id: conv.id }, data: { mode: "HUMAN" } });
    } else if (action === "release") {
      await prisma.conversation.update({ where: { id: conv.id }, data: { mode: "AI" } });
      await prisma.conversationMessage.create({ data: { conversationId: conv.id, sender: "AI", body: "Aap phir se AI assistant se jude hain. Kaise madad karoon?" } });
    } else if (action === "reply" && body) {
      await prisma.conversationMessage.create({ data: { conversationId: conv.id, sender: "STAFF", body: String(body) } });
    } else if (action === "close") {
      await prisma.conversation.update({ where: { id: conv.id }, data: { status: "CLOSED" } });
    } else {
      return json({ error: "bad action" }, 400);
    }
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
