import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { canAccessClass } from "@/lib/access";
import { handleRouteError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { currentMonthRange, toTokyoDateLabel } from "@/lib/time";

const querySchema = z.object({
  classId: z.string().uuid(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

function dateStart(ymd: string) {
  return new Date(`${ymd}T00:00:00.000+09:00`);
}

function dateEnd(ymd: string) {
  return new Date(`${ymd}T23:59:59.999+09:00`);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const parsed = querySchema.safeParse({
      classId: request.nextUrl.searchParams.get("classId") ?? undefined,
      start: request.nextUrl.searchParams.get("start") ?? undefined,
      end: request.nextUrl.searchParams.get("end") ?? undefined
    });

    if (!parsed.success) {
      return jsonError("classId は必須です。start/end は yyyy-mm-dd 形式で指定してください。", 400);
    }

    const { classId, start, end } = parsed.data;

    const allowed = await canAccessClass(session.user.id, session.user.role, classId);
    if (!allowed) {
      return jsonError("このクラスにはアクセスできません。", 403);
    }

    const monthRange = currentMonthRange();
    const rangeStart = start ? dateStart(start) : monthRange.start;
    const rangeEnd = end ? dateEnd(end) : monthRange.end;

    const [classRoom, submissions, students] = await Promise.all([
      prisma.schoolClass.findUnique({ where: { id: classId } }),
      prisma.submission.findMany({
        where: {
          classId,
          timestamp: {
            gte: rangeStart,
            lte: rangeEnd
          }
        },
        orderBy: { timestamp: "asc" },
        include: {
          student: true,
          material: true,
          dailyAssignment: true
        }
      }),
      prisma.student.findMany({
        where: { classId },
        orderBy: { number: "asc" },
        select: { id: true, number: true, displayName: true }
      })
    ]);

    if (!classRoom) {
      return jsonError("クラスが見つかりません。", 404);
    }

    const workbook = new ExcelJS.Workbook();
    const submissionsSheet = workbook.addWorksheet("submissions");
    submissionsSheet.columns = [
      { header: "timestamp_iso", key: "timestamp_iso", width: 30 },
      { header: "year", key: "year", width: 8 },
      { header: "class_code", key: "class_code", width: 10 },
      { header: "number", key: "number", width: 8 },
      { header: "student_name", key: "student_name", width: 18 },
      { header: "material_code", key: "material_code", width: 12 },
      { header: "material_name", key: "material_name", width: 18 },
      { header: "assignment_title", key: "assignment_title", width: 24 },
      { header: "points_awarded", key: "points_awarded", width: 12 },
      { header: "pages_done", key: "pages_done", width: 10 },
      { header: "is_void", key: "is_void", width: 8 }
    ];

    submissions.forEach((item) => {
      submissionsSheet.addRow({
        timestamp_iso: item.timestamp.toISOString(),
        year: classRoom.year,
        class_code: classRoom.classCode,
        number: item.student.number,
        student_name: item.student.displayName,
        material_code: item.material.code,
        material_name: item.material.name,
        assignment_title: item.dailyAssignment?.title ?? "",
        points_awarded: item.pointsAwarded,
        pages_done: item.pagesDone ?? "",
        is_void: item.isVoid
      });
    });

    const summarySheet = workbook.addWorksheet("summary");
    summarySheet.columns = [
      { header: "year", key: "year", width: 8 },
      { header: "class_code", key: "class_code", width: 10 },
      { header: "number", key: "number", width: 8 },
      { header: "student_name", key: "student_name", width: 18 },
      { header: "total_points", key: "total_points", width: 12 },
      { header: "month_points", key: "month_points", width: 12 }
    ];

    const [totalAgg, rangeAgg] = await Promise.all([
      prisma.submission.groupBy({
        by: ["studentId"],
        where: { classId, isVoid: false },
        _sum: { pointsAwarded: true }
      }),
      prisma.submission.groupBy({
        by: ["studentId"],
        where: {
          classId,
          isVoid: false,
          timestamp: {
            gte: rangeStart,
            lte: rangeEnd
          }
        },
        _sum: { pointsAwarded: true }
      })
    ]);

    const totalMap = new Map(totalAgg.map((item) => [item.studentId, item._sum.pointsAwarded ?? 0]));
    const rangeMap = new Map(rangeAgg.map((item) => [item.studentId, item._sum.pointsAwarded ?? 0]));

    students.forEach((student) => {
      summarySheet.addRow({
        year: classRoom.year,
        class_code: classRoom.classCode,
        number: student.number,
        student_name: student.displayName,
        total_points: totalMap.get(student.id) ?? 0,
        month_points: rangeMap.get(student.id) ?? 0
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `submissions_${classRoom.year}${classRoom.classCode}_${toTokyoDateLabel(rangeStart)}_${toTokyoDateLabel(rangeEnd)}.xlsx`;

    return new Response(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${filename}`
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
