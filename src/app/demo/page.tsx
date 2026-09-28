import { prisma } from "@/lib/db";
import DemoChat from "./chat";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const orgs = await prisma.organization.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true, name: true, city: true },
    orderBy: { createdAt: "asc" },
  });
  return <DemoChat orgs={orgs} />;
}
