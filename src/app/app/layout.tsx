import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Shell from "@/components/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s || !s.orgId) redirect("/login");
  const items = [{ href: "/app", label: "Dashboard" }];
  if (s.permissions.includes("APPOINTMENT_VIEW")) items.push({ href: "/app/appointments", label: "Appointments" });
  if (s.permissions.includes("DOCTOR_VIEW")) items.push({ href: "/app/doctors", label: "Doctors" });
  if (s.permissions.includes("PATIENT_VIEW")) items.push({ href: "/app/patients", label: "Patients" });
  if (s.permissions.includes("WHATSAPP_VIEW")) items.push({ href: "/app/inbox", label: "WhatsApp Inbox" });
  if (s.permissions.includes("USER_CREATE")) items.push({ href: "/app/staff", label: "Staff & Roles" });
  if (s.permissions.includes("SETTINGS_MANAGE")) items.push({ href: "/app/settings", label: "Settings" });
  return <Shell title={s.orgName || "Organization"} subtitle={s.roles.join(", ")} items={items}>{children}</Shell>;
}
