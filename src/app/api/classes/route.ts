import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleRouteError } from "@/lib/http";
import { getAccessibleClassIds } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth();
    const classIds = await getAccessibleClassIds(session.user.id, session.user.role);

    const classes = await prisma.schoolClass.findMany({
      where: { id: { in: classIds } },
      orderBy: [{ year: "desc" }, { classCode: "asc" }],
      select: {
        id: true,
        year: true,
        classCode: true,
        name: true
      }
    });

    return NextResponse.json({ ok: true, classes });
  } catch (error) {
    return handleRouteError(error);
  }
}
