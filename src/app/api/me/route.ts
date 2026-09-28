import { getSession } from "@/lib/auth";
import { json } from "@/lib/http";
export async function GET() {
  const s = await getSession();
  if (!s) return json({ error: "not signed in" }, 401);
  return json(s);
}
