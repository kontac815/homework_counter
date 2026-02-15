import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { handleRouteError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { voidSubmission } from "@/lib/scan";

const schema = z.object({
  reason: z.string().min(1).max(200).optional()
});

type Context = {
  params: { id: string };
};

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const session = await requireAuth();
    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      select: { id: true, classId: true }
    });

    if (!submission) {
      return jsonError("提出記録が見つかりません。", 404);
    }

    const allowed = await canAccessClass(session.user.id, session.user.role, submission.classId);
    if (!allowed) {
      return jsonError("この提出記録を取り消す権限がありません。", 403);
    }

    const body = await request.json().catch(() => ({}));
    const { reason } = schema.parse(body);

    const result = await voidSubmission(params.id, reason ?? "manual_undo");
    return NextResponse.json({ ok: true, submission: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
