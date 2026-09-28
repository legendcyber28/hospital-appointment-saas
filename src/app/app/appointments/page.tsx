import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import AppointmentsClient from "./client";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({ searchParams }: { searchParams: { date?: string; doctorId?: string } }) {
  const s = await getSession();
  if (!s?.orgId) redirect("/login");
  const doctors = await prisma.doctor.findMany({ where: { organizationId: s.orgId, status: "ACTIVE" }, orderBy: { name: "asc" } });
  return <AppointmentsClient doctors={doctors.map((d) => ({ id: d.id, name: d.name, fee: d.consultFee }))} canBook={s.permissions.includes("APPOINTMENT_CREATE")} />;
}
