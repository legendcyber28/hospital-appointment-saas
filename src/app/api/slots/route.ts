import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { getAvailableSlots } from "@/lib/slots";
import { getSession, requireOrg } from "@/lib/auth";

// GET /api/slots?doctorId=&date=  (signed-in org users only)
export async function GET(req: Request) {
  try {
    const s = await getSession();
    const orgId = requireOrg(s);
    const u = new URL(req.url);
    const doctorId = u.searchParams.get("doctorId")!;
    const date = u.searchParams.get("date")!;
    const doctor = await prisma.doctor.findFirst({ where: { id: doctorId, organizationId: orgId } });
    if (!doctor) return json({ error: "not found" }, 404);
    const slots = await getAvailableSlots(doctorId, date);
    return json({ slots });
  } catch (e) { return fail(e); }
}
