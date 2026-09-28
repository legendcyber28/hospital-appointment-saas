import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import DoctorsClient from "./client";

export const dynamic = "force-dynamic";

export default async function DoctorsPage() {
  const s = await getSession();
  if (!s?.orgId) redirect("/login");
  const [doctors, departments, branches] = await Promise.all([
    prisma.doctor.findMany({
      where: { organizationId: s.orgId },
      include: { department: true, branch: true, schedules: true, leaves: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ where: { organizationId: s.orgId }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { organizationId: s.orgId } }),
  ]);
  return (
    <DoctorsClient
      canEdit={s.permissions.includes("DOCTOR_CREATE")}
      doctors={doctors.map((d) => ({
        id: d.id, name: d.name, specialization: d.specialization, qualification: d.qualification,
        fee: d.consultFee, followUpFee: d.followUpFee, slotDurationMin: d.slotDurationMin, status: d.status,
        department: d.department?.name, branch: d.branch?.name, schedules: d.schedules, leaves: d.leaves.map((l) => l.date),
      }))}
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
    />
  );
}
