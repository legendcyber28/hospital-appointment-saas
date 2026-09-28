import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { getAvailableSlots } from "@/lib/slots";

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const slug = u.searchParams.get("org")!;
    const doctorId = u.searchParams.get("doctorId")!;
    const date = u.searchParams.get("date")!;
    const org = await prisma.organization.findUnique({ where: { slug } });
    if (!org || org.status !== "ACTIVE") return json({ error: "not found" }, 404);
    const doctor = await prisma.doctor.findFirst({ where: { id: doctorId, organizationId: org.id, status: "ACTIVE" } });
    if (!doctor) return json({ error: "doctor not found" }, 404);
    return json({ slots: await getAvailableSlots(doctorId, date) });
  } catch (e) { return fail(e); }
}
