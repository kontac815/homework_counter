import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { parseQrPayload, sanitizeScanInput } from "@/lib/qr";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  studentId: z.string().uuid(),
  materialId: z.string().uuid(),
  qrPayload: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "admin") {
      return jsonError("冊子登録は管理者のみ可能です。", 403);
    }

    const payload = schema.parse(await request.json());
    const normalizedPayload = sanitizeScanInput(payload.qrPayload);
    parseQrPayload(normalizedPayload);

    const exists = await prisma.booklet.findFirst({
      where: {
        OR: [
          { qrPayload: normalizedPayload },
          { studentId: payload.studentId, materialId: payload.materialId }
        ]
      }
    });

    if (exists) {
      return jsonError("同じ冊子が既に登録されています。", 409);
    }

    const created = await prisma.booklet.create({
      data: {
        studentId: payload.studentId,
        materialId: payload.materialId,
        qrPayload: normalizedPayload
      }
    });

    return NextResponse.json({ ok: true, booklet: created });
  } catch (error) {
    return handleRouteError(error);
  }
}
