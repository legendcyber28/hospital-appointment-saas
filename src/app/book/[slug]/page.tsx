import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import BookClient from "./client";

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: { slug: string } }) {
  const org = await prisma.organization.findUnique({
    where: { slug: params.slug },
    include: { departments: true, doctors: { where: { status: "ACTIVE" }, include: { department: true } } },
  });
  if (!org || org.status !== "ACTIVE") notFound();
  return (
    <BookClient
      org={{ name: org.name, slug: org.slug, city: org.city, address: org.address, phone: org.phone }}
      departments={org.departments.map((d) => ({ id: d.id, name: d.name }))}
      doctors={org.doctors.map((d) => ({ id: d.id, name: d.name, specialization: d.specialization, fee: d.consultFee, departmentId: d.departmentId }))}
    />
  );
}
