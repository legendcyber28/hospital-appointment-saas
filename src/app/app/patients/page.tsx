import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const s = await getSession();
  if (!s?.orgId) redirect("/login");
  const patients = await prisma.patient.findMany({
    where: { organizationId: s.orgId },
    include: { _count: { select: { appointments: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return (
    <>
      <h1 className="text-xl font-bold mb-4">Patients</h1>
      <div className="card">
        <table className="table w-full">
          <thead><tr><th>Name</th><th>WhatsApp</th><th>Gender</th><th>Appointments</th><th>Since</th></tr></thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.name}</td>
                <td>{p.whatsappNumber}</td>
                <td>{p.gender || "-"}</td>
                <td>{p._count.appointments}</td>
                <td className="text-xs text-slate-400">{p.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {patients.length === 0 && <p className="text-sm text-slate-500">No patients yet.</p>}
      </div>
    </>
  );
}
