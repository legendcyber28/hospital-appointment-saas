import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import InboxClient from "./client";

export const dynamic = "force-dynamic";

export default function InboxPage() {
  return <InboxClientLoader />;
}

async function InboxClientLoader() {
  const s = await getSession();
  if (!s?.orgId) redirect("/login");
  return <InboxClient canManage={s.permissions.includes("WHATSAPP_MANAGE")} />;
}
