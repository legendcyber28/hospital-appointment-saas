"use client";
import { useEffect, useState } from "react";
import { todayStr } from "@/lib/format";

type Doctor = { id: string; name: string; specialization: string | null; fee: number; departmentId: string | null };

export default function BookClient({ org, departments, doctors }: {
  org: { name: string; slug: string; city: string | null; address: string | null; phone: string | null };
  departments: { id: string; name: string }[];
  doctors: Doctor[];
}) {
  const [deptId, setDeptId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const filtered = deptId ? doctors.filter((d) => d.departmentId === deptId) : doctors;

  useEffect(() => {
    if (!doctorId || !date) { setSlots([]); return; }
    fetch(`/api/public/slots?org=${org.slug}&doctorId=${doctorId}&date=${date}`)
      .then((r) => r.json()).then((d) => setSlots(d.slots || []));
  }, [doctorId, date, org.slug]);

  async function submit() {
    setErr("");
    const res = await fetch("/api/public/book", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: org.slug, doctorId, date, startTime: slot, patientName: name, patientPhone: phone }),
    });
    const d = await res.json();
    if (!res.ok) { setErr(d.error === "SLOT_TAKEN" ? "That slot was just booked. Pick another." : d.error); return; }
    setDone(`Appointment confirmed with Dr. ${d.appointment.doctor} on ${d.appointment.date} at ${d.appointment.startTime}. Booking ID: ${d.appointment.id.slice(-6).toUpperCase()}`);
  }

  return (
    <main className="min-h-screen bg-brand-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-sm text-slate-500">{[org.address, org.city].filter(Boolean).join(", ")} {org.phone ? `- ${org.phone}` : ""}</p>
        </div>
        {done ? (
          <div className="card text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-medium">{done}</p>
            <button className="btn-ghost mt-4" onClick={() => { setDone(null); setSlot(""); }}>Book another</button>
          </div>
        ) : (
          <div className="card space-y-4">
            <h2 className="font-semibold">Book an appointment</h2>
            <div><label className="label">Department</label>
              <select className="input" value={deptId} onChange={(e) => { setDeptId(e.target.value); setDoctorId(""); }}>
                <option value="">All departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select></div>
            <div><label className="label">Doctor</label>
              <select className="input" value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setSlot(""); }}>
                <option value="">Select doctor</option>
                {filtered.map((d) => <option key={d.id} value={d.id}>Dr. {d.name} {d.specialization ? `(${d.specialization})` : ""} - ₹{d.fee}</option>)}
              </select></div>
            {doctorId && <>
              <div><label className="label">Date</label><input type="date" className="input" min={todayStr()} value={date} onChange={(e) => { setDate(e.target.value); setSlot(""); }} /></div>
              <div><label className="label">Available slots</label>
                {slots.length === 0 ? <p className="text-sm text-slate-500">No slots on this date.</p> : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button key={s} type="button" onClick={() => setSlot(s)}
                        className={`rounded-lg border px-3 py-1.5 text-sm ${slot === s ? "bg-brand-600 text-white border-brand-600" : "bg-white hover:border-brand-500"}`}>{s}</button>
                    ))}
                  </div>
                )}</div>
            </>}
            {slot && <>
              <div><label className="label">Your name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><label className="label">WhatsApp number</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." /></div>
              {err && <div className="text-sm text-red-600">{err}</div>}
              <button className="btn-primary w-full" disabled={!name || !phone} onClick={submit}>Confirm appointment</button>
            </>}
          </div>
        )}
      </div>
    </main>
  );
}
