import { getSession, requirePerm, requireOrg } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const s = await getSession();
    await requirePerm(s, "USER_CREATE");
    const orgId = requireOrg(s);
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      include: { roles: { include: { role: true } } },
      orderBy: { name: "asc" },
    });
    const roles = await prisma.role.findMany({ where: { organizationId: orgId } });
    return json({ users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, status: u.status, roles: u.roles.map((r) => r.role.name) })), roles });
  } catch (e) { return fail(e); }
}
export async function POST(req: Request) {
  try {
    const s = await getSession();
    await requirePerm(s, "USER_CREATE");
    const orgId = requireOrg(s);
    const { name, email, password, roleId } = await req.json();
    const role = await prisma.role.findFirst({ where: { id: roleId, organizationId: orgId } });
    if (!role) return json({ error: "invalid role" }, 400);
    const user = await prisma.user.create({
      data: { organizationId: orgId, name, email: String(email).toLowerCase().trim(), passwordHash: bcrypt.hashSync(String(password), 10) },
    });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    return json({ user: { id: user.id, email: user.email } }, 201);
  } catch (e) { return fail(e); }
}
