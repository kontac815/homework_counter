import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { handleRouteError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { toDateOnly, todayYmdInTokyo } from "@/lib/time";

const createSchema = z.object({
  classId: z.string().uuid(),
  materialId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(100),
  pointsOverride: z.number().int().min(0).max(100).nullable().optional(),
  isRequired: z.boolean().optional()
});

const updateSchema = createSchema.extend({
  id: z.string().uuid()
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const classId = request.nextUrl.searchParams.get("classId");
    const date = request.nextUrl.searchParams.get("date") ?? todayYmdInTokyo();

    if (!classId) {
      return jsonError("classId は必須です。", 400);
    }

    const allowed = await canAccessClass(session.user.id, session.user.role, classId);
    if (!allowed) {
      return jsonError("このクラスにはアクセスできません。", 403);
    }

    const list = await prisma.dailyAssignment.findMany({
      where: {
        classId,
        date: toDateOnly(date)
      },
      orderBy: { createdAt: "asc" },
      include: {
        material: {
          select: {
            id: true,
            code: true,
            name: true,
            pointsPerSubmit: true,
            mode: true
          }
        }
      }
    });

    return NextResponse.json({ ok: true, assignments: list });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "admin") {
      return jsonError("課題作成は管理者のみ可能です。", 403);
    }

    const payload = createSchema.parse(await request.json());

    const created = await prisma.dailyAssignment.create({
      data: {
        classId: payload.classId,
        materialId: payload.materialId,
        date: toDateOnly(payload.date),
        title: payload.title,
        pointsOverride: payload.pointsOverride ?? null,
        isRequired: payload.isRequired ?? true
      }
    });

    return NextResponse.json({ ok: true, assignment: created });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "admin") {
      return jsonError("課題編集は管理者のみ可能です。", 403);
    }

    const payload = updateSchema.parse(await request.json());

    const updated = await prisma.dailyAssignment.update({
      where: { id: payload.id },
      data: {
        classId: payload.classId,
        materialId: payload.materialId,
        date: toDateOnly(payload.date),
        title: payload.title,
        pointsOverride: payload.pointsOverride ?? null,
        isRequired: payload.isRequired ?? true
      }
    });

    return NextResponse.json({ ok: true, assignment: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
