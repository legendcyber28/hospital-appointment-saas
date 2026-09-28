import { getSession, requirePerm, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";

// PUT { schedules: [{dayOfWeek, startTime, endTime, breakStart?, breakEnd?}] } replaces weekly schedule
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await getSession();
    await requirePerm(s, "DOCTOR_EDIT");
    const orgId = requireOrg(s);
    const doctor = await prisma.doctor.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!doctor) return json({ error: "not found" }, 404);
    const { schedules, leaves } = await req.json();
    if (Array.isArray(schedules)) {
      await prisma.doctorSchedule.deleteMany({ where: { doctorId: doctor.id } });
      for (const sc of schedules) {
        await prisma.doctorSchedule.create({
          data: { doctorId: doctor.id, dayOfWeek: Number(sc.dayOfWeek), startTime: sc.startTime, endTime: sc.endTime, breakStart: sc.breakStart || null, breakEnd: sc.breakEnd || null },
        });
      }
    }
    if (Array.isArray(leaves)) {
      for (const date of leaves) {
        await prisma.doctorLeave.upsert({
          where: { doctorId_date: { doctorId: doctor.id, date } },
          update: {}, create: { doctorId: doctor.id, date },
        });
      }
    }
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
