import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import SettingsClient from "./client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSession();
  if (!s?.orgId) redirect("/login");
  const [org, departments, branches, wa] = await Promise.all([
    prisma.organization.findUnique({ where: { id: s.orgId }, include: { plan: true, _count: { select: { doctors: true, branches: true } } } }),
    prisma.department.findMany({ where: { organizationId: s.orgId }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { organizationId: s.orgId } }),
    prisma.whatsAppAccount.findFirst({ where: { organizationId: s.orgId } }),
  ]);
  if (!org) redirect("/login");
  return (
    <SettingsClient
      org={{ name: org.name, type: org.type, city: org.city, slug: org.slug, plan: org.plan?.name || "None", subscriptionStatus: org.subscriptionStatus, doctorCount: org._count.doctors, branchCount: org._count.branches, maxDoctors: org.plan?.maxDoctors, maxBranches: org.plan?.maxBranches }}
      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      branches={branches.map((b) => ({ id: b.id, name: b.name, city: b.city, isMain: b.isMain }))}
      whatsapp={wa ? { phoneNumber: wa.phoneNumber, mode: wa.mode } : null}
    />
  );
}
