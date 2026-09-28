import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";

// Poll conversation messages (demo chat widget). Guarded by conversation id (unguessable cuid).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const conv = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: { messages: { orderBy: { createdAt: "asc" } }, patient: true },
    });
    if (!conv) return json({ error: "not found" }, 404);
    return json({
      conversation: { id: conv.id, mode: conv.mode, status: conv.status, patient: conv.patient?.name },
      messages: conv.messages.map((m) => ({ id: m.id, sender: m.sender, body: m.body, at: m.createdAt })),
    });
  } catch (e) { return fail(e); }
}
