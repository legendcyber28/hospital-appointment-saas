"use client";
import { useEffect, useState, useCallback } from "react";
import { STATUS_COLORS, todayStr } from "@/lib/format";

type Appt = { id: string; date: string; startTime: string; endTime: string; status: string; source: string;
  doctor: { name: string }; patient: { name: string; whatsappNumber: string } };

export default function AppointmentsClient({ doctors, canBook }: { doctors: { id: string; name: string; fee: number }[]; canBook: boolean }) {
  const [date, setDate] = useState(todayStr());
  const [doctorId, setDoctorId] = useState("");
  const [appts, setAppts] = useState<Appt[]>([]);
  const [showBook, setShowBook] = useState(false);

  const load = useCallback(async () => {
    const u = new URLSearchParams({ ...(date ? { date } : {}), ...(doctorId ? { doctorId } : {}) });
    const res = await fetch(`/api/appointments?${u}`);
    if (res.ok) setAppts((await res.json()).appointments);
  }, [date, doctorId]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Appointments</h1>
        <div className="flex gap-2 items-center">
          <input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          <select className="input w-auto" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">All doctors</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
          </select>
          {canBook && <button className="btn-primary" onClick={() => setShowBook(!showBook)}>+ Book</button>}
        </div>
      </div>
      {showBook && <BookForm doctors={doctors} onDone={() => { setShowBook(false); load(); }} />}
      <div className="card">
        {appts.length === 0 ? <p className="text-sm text-slate-500">No appointments for this filter.</p> : (
          <table className="table w-full">
            <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {appts.map((a) => (
                <tr key={a.id}>
                  <td>{a.date}</td>
                  <td className="font-medium">{a.startTime}</td>
                  <td>{a.patient.name}<div className="text-xs text-slate-400">{a.patient.whatsappNumber}</div></td>
                  <td>Dr. {a.doctor.name}</td>
                  <td className="text-xs">{a.source}</td>
                  <td><span className={`badge ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                  <td className="space-x-2 text-xs">
                    {["PENDING", "CONFIRMED"].includes(a.status) && <>
                      <button className="text-purple-600 hover:underline" onClick={() => setStatus(a.id, "CHECKED_IN")}>Check-in</button>
                      <button className="text-red-600 hover:underline" onClick={() => setStatus(a.id, "CANCELLED")}>Cancel</button>
                    </>}
                    {a.status === "CHECKED_IN" && <button className="text-green-600 hover:underline" onClick={() => setStatus(a.id, "COMPLETED")}>Complete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function BookForm({ doctors, onDone }: { doctors: { id: string; name: string; fee: number }[]; onDone: () => void }) {
  const [f, setF] = useState({ doctorId: doctors[0]?.id || "", date: todayStr(), startTime: "", patientName: "", patientPhone: "" });
  const [slots, setSlots] = useState<string[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!f.doctorId || !f.date) return;
    fetch(`/api/slots?doctorId=${f.doctorId}&date=${f.date}`).then((r) => r.json()).then((d) => setSlots(d.slots || []));
  }, [f.doctorId, f.date]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const res = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (!res.ok) { setErr((await res.json()).error); return; }
    onDone();
  }
  return (
    <form onSubmit={submit} className="card mb-4 grid md:grid-cols-3 gap-3">
      <div><label className="label">Doctor</label>
        <select className="input" value={f.doctorId} onChange={(e) => setF({ ...f, doctorId: e.target.value, startTime: "" })}>
          {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name} (₹{d.fee})</option>)}
        </select></div>
      <div><label className="label">Date</label><input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value, startTime: "" })} /></div>
      <div><label className="label">Slot</label>
        <select className="input" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} required>
          <option value="">Select slot</option>
          {slots.map((s) => <option key={s}>{s}</option>)}
        </select></div>
      <div><label className="label">Patient name</label><input className="input" value={f.patientName} onChange={(e) => setF({ ...f, patientName: e.target.value })} required /></div>
      <div><label className="label">WhatsApp number</label><input className="input" value={f.patientPhone} onChange={(e) => setF({ ...f, patientPhone: e.target.value })} required /></div>
      <div className="flex items-end gap-2">
        <button className="btn-primary">Book appointment</button>
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </form>
  );
}
