import { json } from "@/lib/http";
import { SESSION_COOKIE } from "@/lib/auth";
export async function POST() {
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
