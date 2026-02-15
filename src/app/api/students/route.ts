import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { handleRouteError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const classId = request.nextUrl.searchParams.get("classId");

    if (!classId) {
      return jsonError("classId は必須です。", 400);
    }

    const allowed = await canAccessClass(session.user.id, session.user.role, classId);
    if (!allowed) {
      return jsonError("このクラスにはアクセスできません。", 403);
    }

    const students = await prisma.student.findMany({
      where: { classId },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        displayName: true
      }
    });

    return NextResponse.json({ ok: true, students });
  } catch (error) {
    return handleRouteError(error);
  }
}
