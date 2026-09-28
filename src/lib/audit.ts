import { prisma } from "./db";

export async function audit(entry: {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: entry.organizationId ?? null,
      userId: entry.userId ?? null,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId ?? null,
      oldValue: entry.oldValue == null ? null : JSON.stringify(entry.oldValue),
      newValue: entry.newValue == null ? null : JSON.stringify(entry.newValue),
    },
  });
}
