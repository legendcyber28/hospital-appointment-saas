import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { handlePatientMessage } from "@/lib/demo-ai";

// Demo WhatsApp endpoint. In LIVE mode this becomes the WhatsApp Cloud API
// webhook; the org is resolved from the receiving business number. In DEMO
// mode the caller passes orgSlug + phone (simulated patient).
export async function POST(req: Request) {
  try {
    const { orgSlug, phone, name, message } = await req.json();
    if (!orgSlug || !phone || !message) return json({ error: "orgSlug, phone, message required" }, 400);
    const org = await prisma.organization.findUnique({ where: { slug: String(orgSlug) } });
    if (!org) return json({ error: "org not found" }, 404);
    if (org.status !== "ACTIVE") return json({ error: "organization suspended" }, 403);

    // patients are auto-created from their WhatsApp number on first contact
    const patient = await prisma.patient.upsert({
      where: { organizationId_whatsappNumber: { organizationId: org.id, whatsappNumber: phone } },
      update: name ? { name: String(name) } : {},
      create: { organizationId: org.id, whatsappNumber: String(phone), name: name ? String(name) : "WhatsApp User" },
    });
    let conv = await prisma.conversation.findFirst({
      where: { organizationId: org.id, patientId: patient.id, status: "OPEN" },
      orderBy: { updatedAt: "desc" },
    });
    if (conv) {
      // one active conversation per patient: close any stale leftovers
      await prisma.conversation.updateMany({
        where: { organizationId: org.id, patientId: patient.id, status: "OPEN", id: { not: conv.id } },
        data: { status: "CLOSED" },
      });
    }
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { organizationId: org.id, patientId: patient.id, channel: "WHATSAPP_DEMO" },
      });
    }
    const { replies } = await handlePatientMessage({
      conversationId: conv.id, organizationId: org.id, patientPhone: phone, patientName: name, text: message,
    });
    return json({ conversationId: conv.id, replies, mode: conv.mode });
  } catch (e) { return fail(e); }
}
