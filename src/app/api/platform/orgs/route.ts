import { getSession, requirePerm } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { ROLE_PRESETS } from "@/lib/permissions";

export async function GET() {
  try {
    const s = await getSession();
    await requirePerm(s, "PLATFORM_VIEW");
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: { plan: true, _count: { select: { doctors: true, patients: true, appointments: true, users: true } } },
    });
    return json({ orgs });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const s = await getSession();
    await requirePerm(s, "ORG_MANAGE");
    const { name, type, city, state, phone, email, planId, adminName, adminEmail, adminPassword } = await req.json();
    if (!name || !adminEmail || !adminPassword) return json({ error: "name, adminEmail, adminPassword required" }, 400);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const org = await prisma.organization.create({
      data: { name, slug, type: type || "CLINIC", city, state, phone, email, planId: planId || null },
    });
    await prisma.branch.create({ data: { organizationId: org.id, name: "Main Branch", city, isMain: true } });
    // org roles from presets
    const roleIds: Record<string, string> = {};
    for (const rname of ["ORGANIZATION_ADMIN", "DOCTOR", "RECEPTIONIST", "STAFF"]) {
      const role = await prisma.role.create({ data: { organizationId: org.id, name: rname, isSystem: true } });
      for (const p of ROLE_PRESETS[rname]) {
        await prisma.rolePermission.create({ data: { roleId: role.id, permissionKey: p } });
      }
      roleIds[rname] = role.id;
    }
    const admin = await prisma.user.create({
      data: {
        organizationId: org.id, name: adminName || `${name} Admin`,
        email: String(adminEmail).toLowerCase().trim(), passwordHash: bcrypt.hashSync(String(adminPassword), 10),
      },
    });
    await prisma.userRole.create({ data: { userId: admin.id, roleId: roleIds.ORGANIZATION_ADMIN } });
    await audit({ userId: s!.uid, action: "ORG_CREATE", resource: "Organization", resourceId: org.id, newValue: { name } });
    return json({ org: { id: org.id, name: org.name, slug: org.slug }, admin: { email: admin.email } }, 201);
  } catch (e) { return fail(e); }
}
