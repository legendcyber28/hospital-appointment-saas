"use client";
import { useRouter } from "next/navigation";
export default function DoctorActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  async function set(s: string) {
    await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }) });
    router.refresh();
  }
  return (
    <span className="space-x-2 text-xs">
      {["PENDING", "CONFIRMED"].includes(status) && <button className="text-purple-600 hover:underline" onClick={() => set("CHECKED_IN")}>Check-in</button>}
      {status === "CHECKED_IN" && <button className="text-green-600 hover:underline" onClick={() => set("COMPLETED")}>Complete</button>}
      {["PENDING", "CONFIRMED"].includes(status) && <button className="text-red-600 hover:underline" onClick={() => set("NO_SHOW")}>No-show</button>}
    </span>
  );
}
