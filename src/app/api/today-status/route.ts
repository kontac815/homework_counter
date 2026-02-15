import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { handleRouteError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { isWeekdayYmd, zonedDayRange } from "@/lib/time";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const classId = request.nextUrl.searchParams.get("classId");
    const dateYmd = request.nextUrl.searchParams.get("date");

    if (!classId || !dateYmd) {
      return jsonError("classId と date は必須です。", 400);
    }

    const allowed = await canAccessClass(session.user.id, session.user.role, classId);
    if (!allowed) {
      return jsonError("このクラスにはアクセスできません。", 403);
    }

    const dayRange = zonedDayRange(dateYmd);
    const isSchoolDay = isWeekdayYmd(dateYmd);

    const [students, submissions] = await Promise.all([
      prisma.student.findMany({
        where: { classId },
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          displayName: true
        }
      }),
      prisma.submission.findMany({
        where: {
          classId,
          isVoid: false,
          timestamp: {
            gte: dayRange.start,
            lte: dayRange.end
          }
        },
        orderBy: { timestamp: "desc" },
        select: {
          studentId: true,
          timestamp: true,
          pointsAwarded: true
        }
      })
    ]);

    const grouped = new Map<
      string,
      {
        latestAt: Date;
        points: number;
      }
    >();

    for (const submission of submissions) {
      const existing = grouped.get(submission.studentId);
      if (!existing) {
        grouped.set(submission.studentId, {
          latestAt: submission.timestamp,
          points: submission.pointsAwarded
        });
      } else {
        if (submission.timestamp > existing.latestAt) {
          existing.latestAt = submission.timestamp;
        }
        existing.points += submission.pointsAwarded;
      }
    }

    const rows = students.map((student) => {
      const aggregate = grouped.get(student.id);
      const submitted = Boolean(aggregate);

      return {
        studentId: student.id,
        number: student.number,
        displayName: student.displayName,
        submitted,
        timestamp: aggregate?.latestAt.toISOString() ?? null,
        pointsAwarded: aggregate?.points ?? 0
      };
    });

    const missingCount = isSchoolDay ? rows.filter((row) => !row.submitted).length : 0;

    return NextResponse.json({
      ok: true,
      date: dateYmd,
      isSchoolDay,
      missingCount,
      rows
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
