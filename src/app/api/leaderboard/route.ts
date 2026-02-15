import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { getLeaderboards } from "@/lib/leaderboard";
import { handleRouteError, jsonError } from "@/lib/http";

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

    const data = await getLeaderboards(classId);

    return NextResponse.json({
      ok: true,
      tieBreakRule: "同点時は最終提出が早い生徒を上位",
      ...data
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
