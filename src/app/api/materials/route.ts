import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  id: z.string().uuid(),
  pointsPerSubmit: z.number().int().min(0).max(100),
  mode: z.enum(["normal", "self_study"]).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(100).optional()
});

const createSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Za-z0-9_]+$/),
  name: z.string().min(1).max(100),
  pointsPerSubmit: z.number().int().min(0).max(100).default(1),
  mode: z.enum(["normal", "self_study"]).default("normal"),
  isActive: z.boolean().default(true)
});

export async function GET() {
  try {
    await requireAuth();

    const materials = await prisma.material.findMany({
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        pointsPerSubmit: true,
        mode: true,
        isActive: true
      }
    });

    return NextResponse.json({ ok: true, materials });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "admin") {
      return jsonError("教材設定は管理者のみ変更できます。", 403);
    }

    const payload = updateSchema.parse(await request.json());

    const updated = await prisma.material.update({
      where: { id: payload.id },
      data: {
        pointsPerSubmit: payload.pointsPerSubmit,
        ...(payload.mode ? { mode: payload.mode } : {}),
        ...(typeof payload.isActive === "boolean" ? { isActive: payload.isActive } : {}),
        ...(payload.name ? { name: payload.name } : {})
      }
    });

    return NextResponse.json({ ok: true, material: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "admin") {
      return jsonError("教材の追加は管理者のみ可能です。", 403);
    }

    const payload = createSchema.parse(await request.json());
    const code = payload.code.trim().toUpperCase();

    const existing = await prisma.material.findUnique({ where: { code } });
    if (existing) {
      return jsonError("同じ教材コードが既に存在します。", 409);
    }

    const created = await prisma.material.create({
      data: {
        code,
        name: payload.name.trim(),
        pointsPerSubmit: payload.pointsPerSubmit,
        mode: payload.mode,
        isActive: payload.isActive
      }
    });

    return NextResponse.json({ ok: true, material: created });
  } catch (error) {
    return handleRouteError(error);
  }
}
