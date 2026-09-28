import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSIONS, ROLE_PRESETS } from "../src/lib/permissions";

const prisma = new PrismaClient();

async function main() {
  // Permissions
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  // Plans (pricing is data, not code - Super Admin can edit later)
  const starter = await prisma.plan.upsert({
    where: { name: "STARTER" },
    update: {},
    create: { name: "STARTER", priceMonthly: 999, maxDoctors: 5, maxBranches: 1, maxAppointmentsPm: 500 },
  });
  const pro = await prisma.plan.upsert({
    where: { name: "PRO" },
    update: {},
    create: { name: "PRO", priceMonthly: 2499, maxDoctors: 25, maxBranches: 5, maxAppointmentsPm: 5000, whatsappAi: true, analytics: true },
  });
  await prisma.plan.upsert({
    where: { name: "BUSINESS" },
    update: {},
    create: { name: "BUSINESS", priceMonthly: 4999, maxDoctors: 200, maxBranches: 20, maxAppointmentsPm: 100000, whatsappAi: true, analytics: true },
  });

  // Platform SUPER_ADMIN role + user
  const superRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: null as unknown as string, name: "SUPER_ADMIN" } },
    update: {},
    create: { name: "SUPER_ADMIN", isSystem: true },
  }).catch(async () => {
    // upsert with null in compound unique is unreliable; fall back to find/create
    const existing = await prisma.role.findFirst({ where: { organizationId: null, name: "SUPER_ADMIN" } });
    if (existing) return existing;
    return prisma.role.create({ data: { name: "SUPER_ADMIN", isSystem: true } });
  });
  for (const p of ROLE_PRESETS.SUPER_ADMIN) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionKey: { roleId: superRole.id, permissionKey: p } },
      update: {}, create: { roleId: superRole.id, permissionKey: p },
    });
  }
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  const superUser = await prisma.user.upsert({
    where: { email: "owner@platform.com" },
    update: {},
    create: { name: "Platform Owner", email: "owner@platform.com", passwordHash: hash("admin123") },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superUser.id, roleId: superRole.id } },
    update: {}, create: { userId: superUser.id, roleId: superRole.id },
  });

  // Helper: create org-scoped roles from presets
  async function createOrgRoles(orgId: string) {
    const out: Record<string, string> = {};
    for (const name of ["ORGANIZATION_ADMIN", "DOCTOR", "RECEPTIONIST", "STAFF"]) {
      let role = await prisma.role.findFirst({ where: { organizationId: orgId, name } });
      if (!role) role = await prisma.role.create({ data: { organizationId: orgId, name, isSystem: true } });
      for (const p of ROLE_PRESETS[name]) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionKey: { roleId: role.id, permissionKey: p } },
          update: {}, create: { roleId: role.id, permissionKey: p },
        });
      }
      out[name] = role.id;
    }
    return out;
  }

  async function createOrgUser(orgId: string, roleId: string, name: string, email: string, pw: string) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { organizationId: orgId, name, email, passwordHash: hash(pw) },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {}, create: { userId: user.id, roleId },
    });
    return user;
  }

  // ---------------- Demo org: ABC Multispeciality Hospital, Nagpur ----------------
  const abc = await prisma.organization.upsert({
    where: { slug: "abc-hospital" },
    update: {},
    create: {
      name: "ABC Multispeciality Hospital", slug: "abc-hospital", type: "HOSPITAL",
      phone: "+91 71200 00001", email: "contact@abchospital.example",
      address: "Plot 12, Dharampeth", city: "Nagpur", state: "Maharashtra", pincode: "440010",
      whatsappNumber: "+91 90000 00001", planId: pro.id, subscriptionStatus: "ACTIVE",
    },
  });
  const abcRoles = await createOrgRoles(abc.id);
  const mainBranch = await prisma.branch.findFirst({ where: { organizationId: abc.id, isMain: true } })
    ?? await prisma.branch.create({
      data: { organizationId: abc.id, name: "Nagpur Main Branch", address: "Plot 12, Dharampeth", city: "Nagpur", isMain: true },
    });
  await createOrgUser(abc.id, abcRoles.ORGANIZATION_ADMIN, "ABC Admin", "admin@abc.com", "demo123");
  await createOrgUser(abc.id, abcRoles.RECEPTIONIST, "Rekha Receptionist", "reception@abc.com", "demo123");

  const deptNames = ["General Medicine", "Dermatology", "Pediatrics", "Orthopedics", "Dental", "ENT"];
  const depts: Record<string, string> = {};
  for (const name of deptNames) {
    const d = await prisma.department.upsert({
      where: { organizationId_name: { organizationId: abc.id, name } },
      update: {}, create: { organizationId: abc.id, name },
    });
    depts[name] = d.id;
  }

  const doctorSpecs = [
    { name: "Rajesh Sharma", dept: "Dermatology", spec: "Dermatologist", fee: 600, email: "dr.sharma@abc.com" },
    { name: "Neha Singh", dept: "Dermatology", spec: "Dermatologist", fee: 500, email: null },
    { name: "Amit Verma", dept: "General Medicine", spec: "General Physician", fee: 400, email: "dr.verma@abc.com" },
    { name: "Priya Deshmukh", dept: "Pediatrics", spec: "Pediatrician", fee: 550, email: null },
    { name: "Kunal Rao", dept: "Orthopedics", spec: "Orthopedic Surgeon", fee: 800, email: null },
    { name: "Sneha Kulkarni", dept: "Dental", spec: "Dentist", fee: 450, email: null },
  ];
  for (const [i, s] of doctorSpecs.entries()) {
    let userId: string | undefined;
    if (s.email) {
      const u = await createOrgUser(abc.id, abcRoles.DOCTOR, `Dr. ${s.name}`, s.email, "demo123");
      userId = u.id;
    }
    const existing = await prisma.doctor.findFirst({ where: { organizationId: abc.id, name: s.name } });
    const doctor = existing ?? await prisma.doctor.create({
      data: {
        organizationId: abc.id, branchId: mainBranch.id, userId,
        name: s.name, departmentId: depts[s.dept], specialization: s.spec,
        qualification: "MBBS, MD", experienceYears: 5 + i, consultFee: s.fee, followUpFee: Math.round(s.fee / 2),
        slotDurationMin: 30, registrationNo: `MH-${10000 + i}`,
      },
    });
    // Mon-Sat 10:00-13:00 and 17:00-20:00 handled as one window 10:00-20:00 with a 13:00-17:00 break
    for (let dow = 1; dow <= 6; dow++) {
      const has = await prisma.doctorSchedule.findFirst({ where: { doctorId: doctor.id, dayOfWeek: dow } });
      if (!has) {
        await prisma.doctorSchedule.create({
          data: { doctorId: doctor.id, dayOfWeek: dow, startTime: "10:00", endTime: "20:00", breakStart: "13:00", breakEnd: "17:00" },
        });
      }
    }
  }

  await prisma.whatsAppAccount.findFirst({ where: { organizationId: abc.id } }).then(async (w) => {
    if (!w) await prisma.whatsAppAccount.create({
      data: { organizationId: abc.id, phoneNumber: "+91 90000 00001", displayName: "ABC Hospital WhatsApp (Demo)", mode: "DEMO" },
    });
  });

  const p1 = await prisma.patient.upsert({
    where: { organizationId_whatsappNumber: { organizationId: abc.id, whatsappNumber: "+91 98000 11111" } },
    update: {}, create: { organizationId: abc.id, name: "Rahul Patil", whatsappNumber: "+91 98000 11111", gender: "Male" },
  });
  await prisma.patient.upsert({
    where: { organizationId_whatsappNumber: { organizationId: abc.id, whatsappNumber: "+91 98000 22222" } },
    update: {}, create: { organizationId: abc.id, name: "Sunita Joshi", whatsappNumber: "+91 98000 22222", gender: "Female" },
  });

  // ---------------- Second org for tenant-isolation demo ----------------
  const xyz = await prisma.organization.upsert({
    where: { slug: "xyz-clinic" },
    update: {},
    create: {
      name: "XYZ Clinic", slug: "xyz-clinic", type: "CLINIC",
      city: "Nagpur", state: "Maharashtra", planId: starter.id, subscriptionStatus: "TRIAL",
      whatsappNumber: "+91 90000 00002",
    },
  });
  const xyzRoles = await createOrgRoles(xyz.id);
  await createOrgUser(xyz.id, xyzRoles.ORGANIZATION_ADMIN, "XYZ Admin", "admin@xyz.com", "demo123");

  console.log("Seed complete.");
  console.log("Super admin: owner@platform.com / admin123");
  console.log("ABC admin: admin@abc.com / demo123 | reception: reception@abc.com | doctors: dr.sharma@abc.com, dr.verma@abc.com");
  console.log("XYZ admin: admin@xyz.com / demo123");
}

main().finally(() => prisma.$disconnect());
