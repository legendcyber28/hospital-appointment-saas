import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import StaffClient from "./client";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const s = await getSession();
  if (!s?.orgId) redirect("/login");
  const [users, roles] = await Promise.all([
    prisma.user.findMany({ where: { organizationId: s.orgId }, include: { roles: { include: { role: { include: { permissions: true } } } } }, orderBy: { name: "asc" } }),
    prisma.role.findMany({ where: { organizationId: s.orgId }, include: { permissions: true } }),
  ]);
  return (
    <StaffClient
      users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, status: u.status, roles: u.roles.map((r) => r.role.name) }))}
      roles={roles.map((r) => ({ id: r.id, name: r.name, permissions: r.permissions.map((p) => p.permissionKey) }))}
    />
  );
}
