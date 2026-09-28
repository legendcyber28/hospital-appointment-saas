"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Doctor = {
  id: string; name: string; specialization: string | null; qualification: string | null;
  fee: number; followUpFee: number; slotDurationMin: number; status: string;
  department?: string; branch?: string;
  schedules: { dayOfWeek: number; startTime: string; endTime: string; breakStart: string | null; breakEnd: string | null }[];
  leaves: string[];
};

export default function DoctorsClient({ doctors, departments, branches, canEdit }: {
  doctors: Doctor[]; departments: { id: string; name: string }[]; branches: { id: string; name: string }[]; canEdit: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [schedFor, setSchedFor] = useState<Doctor | null>(null);
  const router = useRouter();
  async function toggleStatus(d: Doctor) {
    await fetch(`/api/org/doctors/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }) });
    router.refresh();
  }
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Doctors</h1>
        {canEdit && <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>+ Add doctor</button>}
      </div>
      {showAdd && <AddDoctorForm departments={departments} branches={branches} onDone={() => { setShowAdd(false); router.refresh(); }} />}
      {schedFor && <ScheduleEditor doctor={schedFor} onClose={() => { setSchedFor(null); router.refresh(); }} />}
      <div className="card">
        <table className="table w-full">
          <thead><tr><th>Name</th><th>Department</th><th>Branch</th><th>Fee</th><th>Slot</th><th>Schedule</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {doctors.map((d) => (
              <tr key={d.id}>
                <td><div className="font-medium">Dr. {d.name}</div><div className="text-xs text-slate-400">{d.qualification}</div></td>
                <td>{d.department || "-"}</td>
                <td>{d.branch || "-"}</td>
                <td>₹{d.fee}</td>
                <td>{d.slotDurationMin}m</td>
                <td className="text-xs">
                  {d.schedules.length === 0 ? "Not set" :
                    d.schedules.map((sc) => `${DAYS[sc.dayOfWeek]} ${sc.startTime}-${sc.endTime}${sc.breakStart ? ` (break ${sc.breakStart}-${sc.breakEnd})` : ""}`).join(", ")}
                  {d.leaves.length > 0 && <div className="text-red-500">Leave: {d.leaves.join(", ")}</div>}
                </td>
                <td><span className={`badge ${d.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>{d.status}</span></td>
                <td className="space-x-2 text-xs">
                  {canEdit && <>
                    <button className="text-brand-600 hover:underline" onClick={() => setSchedFor(d)}>Schedule</button>
                    <button className="text-red-600 hover:underline" onClick={() => toggleStatus(d)}>{d.status === "ACTIVE" ? "Deactivate" : "Activate"}</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AddDoctorForm({ departments, branches, onDone }: { departments: { id: string; name: string }[]; branches: { id: string; name: string }[]; onDone: () => void }) {
  const [f, setF] = useState({ name: "", specialization: "", qualification: "", consultFee: "500", followUpFee: "250", slotDurationMin: "30", departmentId: departments[0]?.id || "", branchId: branches[0]?.id || "" });
  const [err, setErr] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const res = await fetch("/api/org/doctors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (!res.ok) { setErr((await res.json()).error); return; }
    onDone();
  }
  return (
    <form onSubmit={submit} className="card mb-4 grid md:grid-cols-4 gap-3">
      <div><label className="label">Name</label><input className="input" value={f.name} onChange={set("name")} required /></div>
      <div><label className="label">Specialization</label><input className="input" value={f.specialization} onChange={set("specialization")} /></div>
      <div><label className="label">Department</label>
        <select className="input" value={f.departmentId} onChange={set("departmentId")}>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
      <div><label className="label">Branch</label>
        <select className="input" value={f.branchId} onChange={set("branchId")}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div><label className="label">Consult fee (₹)</label><input className="input" type="number" value={f.consultFee} onChange={set("consultFee")} /></div>
      <div><label className="label">Follow-up fee (₹)</label><input className="input" type="number" value={f.followUpFee} onChange={set("followUpFee")} /></div>
      <div><label className="label">Slot duration (min)</label><input className="input" type="number" value={f.slotDurationMin} onChange={set("slotDurationMin")} /></div>
      <div className="flex items-end gap-2"><button className="btn-primary">Add</button>{err && <span className="text-sm text-red-600">{err}</span>}</div>
    </form>
  );
}

function ScheduleEditor({ doctor, onClose }: { doctor: Doctor; onClose: () => void }) {
  const [rows, setRows] = useState(
    [1, 2, 3, 4, 5, 6].map((dow) => {
      const ex = doctor.schedules.find((s) => s.dayOfWeek === dow);
      return { dayOfWeek: dow, enabled: !!ex, startTime: ex?.startTime || "10:00", endTime: ex?.endTime || "20:00", breakStart: ex?.breakStart || "", breakEnd: ex?.breakEnd || "" };
    })
  );
  const [leaveDate, setLeaveDate] = useState("");
  async function save() {
    await fetch(`/api/org/doctors/${doctor.id}/schedule`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schedules: rows.filter((r) => r.enabled).map((r) => ({ ...r, breakStart: r.breakStart || undefined, breakEnd: r.breakEnd || undefined })),
        leaves: leaveDate ? [leaveDate] : [],
      }),
    });
    onClose();
  }
  return (
    <div className="card mb-4">
      <h3 className="font-semibold mb-3">Weekly schedule - Dr. {doctor.name}</h3>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.dayOfWeek} className="flex items-center gap-2 text-sm">
            <label className="w-16 flex items-center gap-1">
              <input type="checkbox" checked={r.enabled} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))} />
              {DAYS[r.dayOfWeek]}
            </label>
            <input type="time" className="input w-auto" value={r.startTime} disabled={!r.enabled} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, startTime: e.target.value } : x))} />
            <span>to</span>
            <input type="time" className="input w-auto" value={r.endTime} disabled={!r.enabled} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, endTime: e.target.value } : x))} />
            <span className="text-xs text-slate-400">break</span>
            <input type="time" className="input w-auto" value={r.breakStart} disabled={!r.enabled} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, breakStart: e.target.value } : x))} />
            <span>to</span>
            <input type="time" className="input w-auto" value={r.breakEnd} disabled={!r.enabled} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, breakEnd: e.target.value } : x))} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-sm">
        <label className="label mb-0">Add leave:</label>
        <input type="date" className="input w-auto" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} />
        <button className="btn-primary" onClick={save}>Save schedule</button>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
