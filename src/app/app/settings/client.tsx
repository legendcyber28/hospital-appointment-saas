"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsClient({ org, departments, branches, whatsapp }: {
  org: { name: string; type: string; city: string | null; slug: string; plan: string; subscriptionStatus: string; doctorCount: number; branchCount: number; maxDoctors?: number | null; maxBranches?: number | null };
  departments: { id: string; name: string }[];
  branches: { id: string; name: string; city: string | null; isMain: boolean }[];
  whatsapp: { phoneNumber: string; mode: string } | null;
}) {
  const [dept, setDept] = useState("");
  const [branch, setBranch] = useState({ name: "", city: "" });
  const [msg, setMsg] = useState("");
  const router = useRouter();
  async function addDept() {
    const res = await fetch("/api/org/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: dept }) });
    if (!res.ok) setMsg((await res.json()).error);
    setDept(""); router.refresh();
  }
  async function addBranch() {
    const res = await fetch("/api/org/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(branch) });
    const d = await res.json();
    if (!res.ok) { setMsg(d.error); return; }
    setBranch({ name: "", city: "" }); router.refresh();
  }
  return (
    <>
      <h1 className="text-xl font-bold mb-4">Settings</h1>
      {msg && <div className="card mb-4 text-sm text-red-600">{msg}</div>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-2">Organization</h2>
          <div className="text-sm space-y-1">
            <div><span className="text-slate-500">Name:</span> {org.name}</div>
            <div><span className="text-slate-500">Type:</span> {org.type}</div>
            <div><span className="text-slate-500">City:</span> {org.city || "-"}</div>
            <div><span className="text-slate-500">Booking page:</span> <a className="text-brand-600 hover:underline" href={`/book/${org.slug}`} target="_blank">/book/{org.slug}</a></div>
          </div>
          <h2 className="font-semibold mt-4 mb-2">Subscription</h2>
          <div className="text-sm space-y-1">
            <div><span className="text-slate-500">Plan:</span> {org.plan} ({org.subscriptionStatus})</div>
            <div><span className="text-slate-500">Doctors:</span> {org.doctorCount}{org.maxDoctors ? ` / ${org.maxDoctors}` : ""}</div>
            <div><span className="text-slate-500">Branches:</span> {org.branchCount}{org.maxBranches ? ` / ${org.maxBranches}` : ""}</div>
          </div>
          <h2 className="font-semibold mt-4 mb-2">WhatsApp</h2>
          {whatsapp ? (
            <div className="text-sm">
              <div><span className="text-slate-500">Number:</span> {whatsapp.phoneNumber}</div>
              <div><span className="badge bg-amber-100 text-amber-800 mt-1">{whatsapp.mode} MODE</span>
                <span className="text-xs text-slate-400 ml-2">live mode needs WhatsApp Cloud API credentials</span></div>
            </div>
          ) : <p className="text-sm text-slate-500">No WhatsApp number configured.</p>}
        </div>
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold mb-2">Departments</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {departments.map((d) => <span key={d.id} className="badge bg-slate-100 text-slate-700">{d.name}</span>)}
            </div>
            <div className="flex gap-2">
              <input className="input" placeholder="New department" value={dept} onChange={(e) => setDept(e.target.value)} />
              <button className="btn-primary" onClick={addDept} disabled={!dept}>Add</button>
            </div>
          </div>
          <div className="card">
            <h2 className="font-semibold mb-2">Branches</h2>
            <div className="space-y-1 mb-3 text-sm">
              {branches.map((b) => <div key={b.id}>{b.name}{b.isMain && <span className="badge bg-brand-50 text-brand-700 ml-2">Main</span>} <span className="text-xs text-slate-400">{b.city}</span></div>)}
            </div>
            <div className="flex gap-2">
              <input className="input" placeholder="Branch name" value={branch.name} onChange={(e) => setBranch({ ...branch, name: e.target.value })} />
              <input className="input" placeholder="City" value={branch.city} onChange={(e) => setBranch({ ...branch, city: e.target.value })} />
              <button className="btn-primary" onClick={addBranch} disabled={!branch.name}>Add</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
