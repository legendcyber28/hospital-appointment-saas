"use client";
import { useRouter } from "next/navigation";
export default function OrgActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  async function toggle() {
    await fetch(`/api/platform/orgs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }),
    });
    router.refresh();
  }
  return (
    <button onClick={toggle} className={`text-xs ${status === "ACTIVE" ? "text-red-600" : "text-green-600"} hover:underline`}>
      {status === "ACTIVE" ? "Suspend" : "Activate"}
    </button>
  );
}
