import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Shell from "@/components/shell";
import Stat from "@/components/stat";
import { STATUS_COLORS, todayStr } from "@/lib/format";
import DoctorActions from "./actions";

export const dynamic = "force-dynamic";

export default async function DoctorDashboard() {
  const s = await getSession();
  if (!s?.orgId) redirect("/login");
  const me = await prisma.doctor.findFirst({ where: { userId: s.uid, organizationId: s.orgId }, include: { department: true, schedules: true } });
  if (!me) redirect("/app");
  const today = todayStr();
  const [todays, upcoming] = await Promise.all([
    prisma.appointment.findMany({ where: { doctorId: me.id, date: today }, include: { patient: true }, orderBy: { startTime: "asc" } }),
    prisma.appointment.findMany({ where: { doctorId: me.id, date: { gt: today }, status: { notIn: ["CANCELLED"] } }, include: { patient: true }, orderBy: [{ date: "asc" }, { startTime: "asc" }], take: 20 }),
  ]);
  return (
    <Shell title={`Dr. ${me.name}`} subtitle={me.department?.name || ""} items={[{ href: "/doctor", label: "My Dashboard" }]}>
      <h1 className="text-xl font-bold mb-4">My Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Today" value={todays.filter((a) => a.status !== "CANCELLED").length} />
        <Stat label="Completed today" value={todays.filter((a) => a.status === "COMPLETED").length} />
        <Stat label="Upcoming" value={upcoming.length} />
        <Stat label="Consult fee" value={`₹${me.consultFee}`} />
      </div>
      <div className="card mt-6">
        <h2 className="font-semibold mb-3">Today's patients</h2>
        <table className="table w-full">
          <thead><tr><th>Time</th><th>Patient</th><th>Phone</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {todays.map((a) => (
              <tr key={a.id}>
                <td className="font-medium">{a.startTime}</td>
                <td>{a.patient.name}</td>
                <td className="text-xs">{a.patient.whatsappNumber}</td>
                <td><span className={`badge ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                <td><DoctorActions id={a.id} status={a.status} /></td>
              </tr>
            ))}
            {todays.length === 0 && <tr><td colSpan={5} className="text-sm text-slate-500">No patients today.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card mt-6">
        <h2 className="font-semibold mb-3">Upcoming</h2>
        <table className="table w-full">
          <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Status</th></tr></thead>
          <tbody>
            {upcoming.map((a) => (
              <tr key={a.id}><td>{a.date}</td><td>{a.startTime}</td><td>{a.patient.name}</td><td><span className={`badge ${STATUS_COLORS[a.status]}`}>{a.status}</span></td></tr>
            ))}
            {upcoming.length === 0 && <tr><td colSpan={4} className="text-sm text-slate-500">Nothing upcoming.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
