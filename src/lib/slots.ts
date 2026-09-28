import { prisma } from "./db";

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
export function toHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Generate available slots for a doctor on a date (YYYY-MM-DD). */
export async function getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { schedules: true, leaves: true },
  });
  if (!doctor || doctor.status !== "ACTIVE") return [];
  if (doctor.leaves.some((l) => l.date === date)) return [];

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const sched = doctor.schedules.find((s) => s.dayOfWeek === dayOfWeek);
  if (!sched) return [];

  const dur = doctor.slotDurationMin || 30;
  const start = toMinutes(sched.startTime);
  const end = toMinutes(sched.endTime);
  const bStart = sched.breakStart ? toMinutes(sched.breakStart) : null;
  const bEnd = sched.breakEnd ? toMinutes(sched.breakEnd) : null;

  const booked = await prisma.appointment.findMany({
    where: { doctorId, date, status: { notIn: ["CANCELLED"] } },
    select: { startTime: true },
  });
  const bookedSet = new Set(booked.map((b) => b.startTime));

  const now = new Date();
  const isToday = date === todayLocal();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const slots: string[] = [];
  for (let t = start; t + dur <= end; t += dur) {
    if (bStart != null && bEnd != null && t < bEnd && t + dur > bStart) continue; // overlaps break
    const hhmm = toHHMM(t);
    if (bookedSet.has(hhmm)) continue;
    if (isToday && t <= nowMin) continue;
    slots.push(hhmm);
  }
  return slots;
}

/** Book atomically; throws if the slot is already taken (double-booking prevention). */
export async function bookAppointment(data: {
  organizationId: string; branchId?: string | null; doctorId: string; patientId: string;
  date: string; startTime: string; source: string; reason?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const doctor = await tx.doctor.findUnique({ where: { id: data.doctorId } });
    if (!doctor) throw new Error("Doctor not found");
    const clash = await tx.appointment.count({
      where: { doctorId: data.doctorId, date: data.date, startTime: data.startTime, status: { notIn: ["CANCELLED"] } },
    });
    if (clash > 0) throw new Error("SLOT_TAKEN");
    const endTime = toHHMM(toMinutes(data.startTime) + (doctor.slotDurationMin || 30));
    return tx.appointment.create({
      data: { ...data, endTime, status: "CONFIRMED" },
      include: { doctor: true, patient: true },
    });
  });
}
