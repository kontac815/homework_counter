import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getAccessibleClassIds(userId: string, role: UserRole) {
  if (role === "admin") {
    const classes = await prisma.schoolClass.findMany({ select: { id: true } });
    return classes.map((item) => item.id);
  }

  const linked = await prisma.userClass.findMany({
    where: { userId },
    select: { classId: true }
  });

  if (linked.length > 0) {
    return linked.map((item) => item.classId);
  }

  const allClasses = await prisma.schoolClass.findMany({ select: { id: true } });
  return allClasses.map((item) => item.id);
}

export async function canAccessClass(userId: string, role: UserRole, classId: string) {
  if (role === "admin") return true;
  const ids = await getAccessibleClassIds(userId, role);
  return ids.includes(classId);
}
