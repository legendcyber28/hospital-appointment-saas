import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { bookAppointment } from "@/lib/slots";

export async function POST(req: Request) {
  try {
    const { org: slug, doctorId, date, startTime, patientName, patientPhone } = await req.json();
    const org = await prisma.organization.findUnique({ where: { slug: String(slug) } });
    if (!org || org.status !== "ACTIVE") return json({ error: "not found" }, 404);
    const doctor = await prisma.doctor.findFirst({ where: { id: doctorId, organizationId: org.id, status: "ACTIVE" } });
    if (!doctor) return json({ error: "doctor not found" }, 404);
    const patient = await prisma.patient.upsert({
      where: { organizationId_whatsappNumber: { organizationId: org.id, whatsappNumber: patientPhone } },
      update: { name: patientName },
      create: { organizationId: org.id, name: patientName, whatsappNumber: patientPhone },
    });
    const appt = await bookAppointment({
      organizationId: org.id, branchId: doctor.branchId, doctorId: doctor.id,
      patientId: patient.id, date, startTime, source: "WEB",
    });
    return json({ appointment: { id: appt.id, date: appt.date, startTime: appt.startTime, doctor: appt.doctor.name } }, 201);
  } catch (e) { return fail(e); }
}
