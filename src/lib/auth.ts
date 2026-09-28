import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-secret-change-in-production");
export const SESSION_COOKIE = "hs_session";

export type Session = {
  uid: string;
  name: string;
  email: string;
  orgId: string | null;      // null = platform super admin
  orgSlug: string | null;
  orgName: string | null;
  roles: string[];
  permissions: string[];
};

export async function createSession(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: { include: { permissions: true } } } }, organization: true },
  });
  if (!user) throw new Error("user not found");
  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = [...new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permissionKey)))];
  const session: Session = {
    uid: user.id,
    name: user.name,
    email: user.email,
    orgId: user.organizationId,
    orgSlug: user.organization?.slug ?? null,
    orgName: user.organization?.name ?? null,
    roles,
    permissions,
  };
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export function hasPerm(session: Session | null, perm: string): boolean {
  return !!session && session.permissions.includes(perm);
}

/** Tenant guard: returns the org id the request is allowed to act on. Never trusts client-supplied org ids. */
export function requireOrg(session: Session | null): string {
  if (!session || !session.orgId) throw new AuthError("Not signed in to an organization", 401);
  return session.orgId;
}

export class AuthError extends Error {
  status: number;
  constructor(msg: string, status = 403) { super(msg); this.status = status; }
}

export async function requirePerm(session: Session | null, perm: string) {
  if (!session) throw new AuthError("Not signed in", 401);
  if (!session.permissions.includes(perm)) throw new AuthError(`Missing permission ${perm}`, 403);
}
