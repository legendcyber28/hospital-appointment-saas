import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Stat from "@/components/stat";
import { inr, todayStr, STATUS_COLORS } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrgDashboard() {
  const s = await getSession();
  if (!s?.orgId) redirect("/login");
  const orgId = s.orgId;
  const today = todayStr();
  const [todayAppts, upcoming, doctors, patients, handoffs, done, todaysList] = await Promise.all([
    prisma.appointment.count({ where: { organizationId: orgId, date: today, status: { notIn: ["CANCELLED"] } } }),
    prisma.appointment.count({ where: { organizationId: orgId, date: { gt: today }, status: { notIn: ["CANCELLED"] } } }),
    prisma.doctor.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    prisma.patient.count({ where: { organizationId: orgId } }),
    prisma.conversation.count({ where: { organizationId: orgId, mode: "HUMAN", status: "OPEN" } }),
    prisma.appointment.findMany({ where: { organizationId: orgId, status: "COMPLETED" }, include: { doctor: true } }),
    prisma.appointment.findMany({
      where: { organizationId: orgId, date: today },
      include: { doctor: true, patient: true },
      orderBy: { startTime: "asc" }, take: 10,
    }),
  ]);
  const revenue = done.reduce((sum, a) => sum + a.doctor.consultFee, 0);
  return (
    <>
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Stat label="Today's appointments" value={todayAppts} />
        <Stat label="Upcoming" value={upcoming} />
        <Stat label="Active doctors" value={doctors} />
        <Stat label="Patients" value={patients} />
        <Stat label="Revenue (completed)" value={inr(revenue)} />
        <Stat label="Human handoffs open" value={handoffs} />
      </div>
      <div className="card mt-6">
        <h2 className="font-semibold mb-3">Today's schedule</h2>
        {todaysList.length === 0 ? <p className="text-sm text-slate-500">No appointments today.</p> : (
          <table className="table w-full">
            <thead><tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Source</th><th>Status</th></tr></thead>
            <tbody>
              {todaysList.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.startTime}</td>
                  <td>{a.patient.name}<div className="text-xs text-slate-400">{a.patient.whatsappNumber}</div></td>
                  <td>Dr. {a.doctor.name}</td>
                  <td className="text-xs">{a.source}</td>
                  <td><span className={`badge ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
