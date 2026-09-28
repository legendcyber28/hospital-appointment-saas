import { prisma } from "@/lib/db";
import { json, fail } from "@/lib/http";

// Public booking-page data: departments + doctors + fees. No private data.
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.slug },
      include: {
        departments: true,
        doctors: { where: { status: "ACTIVE" }, include: { department: true } },
      },
    });
    if (!org || org.status !== "ACTIVE") return json({ error: "not found" }, 404);
    return json({
      org: { name: org.name, slug: org.slug, city: org.city, address: org.address, phone: org.phone, type: org.type },
      departments: org.departments.map((d) => ({ id: d.id, name: d.name })),
      doctors: org.doctors.map((d) => ({ id: d.id, name: d.name, specialization: d.specialization, fee: d.consultFee, department: d.department?.name })),
    });
  } catch (e) { return fail(e); }
}
