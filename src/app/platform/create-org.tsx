"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateOrgForm({ plans }: { plans: { id: string; name: string }[] }) {
  const [f, setF] = useState({ name: "", type: "CLINIC", city: "", phone: "", email: "", planId: "", adminName: "", adminEmail: "", adminPassword: "" });
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const res = await fetch("/api/platform/orgs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, planId: f.planId || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error); return; }
    setMsg(`Created ${data.org.name}. Admin login: ${data.admin.email}`);
    setF({ name: "", type: "CLINIC", city: "", phone: "", email: "", planId: "", adminName: "", adminEmail: "", adminPassword: "" });
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="card space-y-3 h-fit">
      <h2 className="font-semibold">Create Organization</h2>
      <div><label className="label">Organization name</label><input className="input" value={f.name} onChange={set("name")} required /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Type</label>
          <select className="input" value={f.type} onChange={set("type")}>
            {["HOSPITAL", "CLINIC", "DOCTOR_PRACTICE", "DENTAL", "DIAGNOSTIC", "PHYSIOTHERAPY", "OTHER"].map((t) => <option key={t}>{t}</option>)}
          </select></div>
        <div><label className="label">City</label><input className="input" value={f.city} onChange={set("city")} /></div>
      </div>
      <div><label className="label">Plan</label>
        <select className="input" value={f.planId} onChange={set("planId")}>
          <option value="">No plan</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></div>
      <hr />
      <div><label className="label">Admin name</label><input className="input" value={f.adminName} onChange={set("adminName")} /></div>
      <div><label className="label">Admin email</label><input className="input" type="email" value={f.adminEmail} onChange={set("adminEmail")} required /></div>
      <div><label className="label">Admin password</label><input className="input" value={f.adminPassword} onChange={set("adminPassword")} required /></div>
      {msg && <div className="text-sm text-brand-700">{msg}</div>}
      <button className="btn-primary w-full">Create</button>
    </form>
  );
}
