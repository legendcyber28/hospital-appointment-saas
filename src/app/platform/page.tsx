import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Shell from "@/components/shell";
import Stat from "@/components/stat";
import { inr, todayStr } from "@/lib/format";
import CreateOrgForm from "./create-org";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const s = await getSession();
  if (!s || !s.permissions.includes("PLATFORM_VIEW")) redirect("/login");
  const today = todayStr();
  const [orgs, doctors, patients, appts, apptsToday, wa, plans] = await Promise.all([
    prisma.organization.findMany({ orderBy: { createdAt: "desc" }, include: { plan: true, _count: { select: { doctors: true, patients: true, appointments: true } } } }),
    prisma.doctor.count(), prisma.patient.count(), prisma.appointment.count(),
    prisma.appointment.count({ where: { date: today } }),
    prisma.whatsAppAccount.count(),
    prisma.plan.findMany({ include: { _count: { select: { organizations: true } } } }),
  ]);
  const revenue = plans.reduce((sum, p) => sum + p._count.organizations * p.priceMonthly, 0);

  return (
    <Shell title="SwasthBook" subtitle="Super Admin" items={[{ href: "/platform", label: "Platform Dashboard" }]}>
      <h1 className="text-xl font-bold mb-4">Platform Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Organizations" value={orgs.length} hint={`${orgs.filter((o) => o.status === "ACTIVE").length} active / ${orgs.filter((o) => o.status === "SUSPENDED").length} suspended`} />
        <Stat label="Doctors" value={doctors} />
        <Stat label="Patients" value={patients} />
        <Stat label="Appointments" value={appts} hint={`${apptsToday} today`} />
        <Stat label="Subscription revenue" value={inr(revenue) + "/mo"} />
        <Stat label="WhatsApp-connected orgs" value={wa} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold mb-3">Organizations</h2>
          <table className="table w-full">
            <thead><tr><th>Name</th><th>Plan</th><th>Doctors</th><th>Patients</th><th>Appts</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td><div className="font-medium">{o.name}</div><div className="text-xs text-slate-400">{o.city || ""} - {o.type}</div></td>
                  <td>{o.plan?.name || "-"}</td>
                  <td>{o._count.doctors}</td>
                  <td>{o._count.patients}</td>
                  <td>{o._count.appointments}</td>
                  <td><span className={`badge ${o.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{o.status}</span></td>
                  <td><OrgActions id={o.id} status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CreateOrgForm plans={plans.map((p) => ({ id: p.id, name: p.name }))} />
      </div>
    </Shell>
  );
}

import OrgActions from "./org-actions";
