import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { handleRouteError, jsonError } from "@/lib/http";
import { processScan } from "@/lib/scan";

const schema = z.object({
  rawPayload: z.string().min(1),
  classId: z.string().uuid(),
  dateYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pagesDone: z.number().int().min(1).max(500).optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const payload = schema.parse(await request.json());

    const allowed = await canAccessClass(session.user.id, session.user.role, payload.classId);
    if (!allowed) {
      return jsonError("このクラスにはアクセスできません。", 403);
    }

    const result = await processScan(payload);

    if (result.status === "not_found" && session.user.role !== "admin") {
      return NextResponse.json({
        ok: true,
        result: {
          ...result,
          canCreateBooklet: false
        }
      });
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return handleRouteError(error);
  }
}
