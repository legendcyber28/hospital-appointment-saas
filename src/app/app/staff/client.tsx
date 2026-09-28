"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffClient({ users, roles }: {
  users: { id: string; name: string; email: string; status: string; roles: string[] }[];
  roles: { id: string; name: string; permissions: string[] }[];
}) {
  const [f, setF] = useState({ name: "", email: "", password: "", roleId: roles.find((r) => r.name === "RECEPTIONIST")?.id || roles[0]?.id || "" });
  const [msg, setMsg] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const res = await fetch("/api/org/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json();
    if (!res.ok) { setMsg(d.error); return; }
    setMsg(`Created login for ${d.user.email}`);
    setF({ ...f, name: "", email: "", password: "" });
    router.refresh();
  }
  return (
    <>
      <h1 className="text-xl font-bold mb-4">Staff & Roles</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold mb-3">Users</h2>
          <table className="table w-full">
            <thead><tr><th>Name</th><th>Email</th><th>Roles</th><th>Status</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td><td>{u.email}</td>
                  <td>{u.roles.map((r) => <span key={r} className="badge bg-slate-100 text-slate-700 mr-1">{r}</span>)}</td>
                  <td>{u.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="font-semibold mt-6 mb-3">Roles & permissions</h2>
          <div className="space-y-2">
            {roles.map((r) => (
              <div key={r.id} className="text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="text-xs text-slate-500 ml-2">{r.permissions.join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
        <form onSubmit={submit} className="card space-y-3 h-fit">
          <h2 className="font-semibold">Add staff user</h2>
          <div><label className="label">Name</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
          <div><label className="label">Password</label><input className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
          <div><label className="label">Role</label>
            <select className="input" value={f.roleId} onChange={(e) => setF({ ...f, roleId: e.target.value })}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select></div>
          {msg && <div className="text-sm text-brand-700">{msg}</div>}
          <button className="btn-primary w-full">Create user</button>
        </form>
      </div>
    </>
  );
}
