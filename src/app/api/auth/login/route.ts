import { prisma } from "@/lib/db";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { json, fail } from "@/lib/http";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (!user || user.status !== "ACTIVE" || !bcrypt.compareSync(String(password), user.passwordHash)) {
      return json({ error: "Email ya password galat hai" }, 401);
    }
    const token = await createSession(user.id);
    const res = json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (e) { return fail(e); }
}
