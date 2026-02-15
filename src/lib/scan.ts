import { MaterialMode, Prisma } from "@prisma/client";
import { currentMonthRange, isWeekdayYmd, timestampInTokyoDate, zonedDayRange } from "@/lib/time";
import { parseQrPayload, sanitizeScanInput } from "@/lib/qr";
import { prisma } from "@/lib/prisma";

export type ScanResult =
  | {
      status: "success";
      submissionId: string;
      studentName: string;
      materialName: string;
      pointsAwarded: number;
      cumulativePoints: number;
      monthlyPoints: number;
      crcWarning?: string;
    }
  | {
      status: "duplicate";
      message: string;
      submissionId: string;
    }
  | {
      status: "not_found";
      message: string;
      parsed?: {
        year: number;
        classCode: string;
        number: number;
        materialCode: string;
        normalizedPayload: string;
      };
      canCreateBooklet: boolean;
    };

export async function processScan(input: {
  rawPayload: string;
  classId: string;
  dateYmd: string;
  pagesDone?: number;
}) {
  if (!isWeekdayYmd(input.dateYmd)) {
    throw new Error("土日は提出対象外です。平日の日付を選択してください。");
  }

  const sanitized = sanitizeScanInput(input.rawPayload);
  const parsed = parseQrPayload(sanitized);

  let booklet = await prisma.booklet.findUnique({
    where: { qrPayload: parsed.normalizedPayload },
    include: { student: true, material: true }
  });

  if (!booklet) {
    const classRoom = await prisma.schoolClass.findUnique({
      where: {
        year_classCode: {
          year: parsed.year,
          classCode: parsed.classCode
        }
      }
    });

    if (classRoom && classRoom.id !== input.classId) {
      throw new Error("このQRは選択中クラスの生徒ではありません。");
    }

    const material = await prisma.material.findUnique({ where: { code: parsed.materialCode } });

    const student = classRoom
      ? await prisma.student.findUnique({
          where: {
            classId_number: {
              classId: classRoom.id,
              number: parsed.number
            }
          }
        })
      : null;

    if (classRoom && student && material) {
      booklet = await prisma.booklet.create({
        data: {
          studentId: student.id,
          materialId: material.id,
          qrPayload: parsed.normalizedPayload
        },
        include: {
          student: true,
          material: true
        }
      });
    } else {
      return {
        status: "not_found",
        message: "QRに対応する冊子が未登録です。",
        parsed: {
          year: parsed.year,
          classCode: parsed.classCode,
          number: parsed.number,
          materialCode: parsed.materialCode,
          normalizedPayload: parsed.normalizedPayload
        },
        canCreateBooklet: Boolean(classRoom && student && material)
      } satisfies ScanResult;
    }
  }

  if (booklet.student.classId !== input.classId) {
    throw new Error("このQRは選択中クラスの生徒ではありません。");
  }

  const materialMode = booklet.material.mode;

  if (materialMode === MaterialMode.self_study) {
    if (!input.pagesDone || input.pagesDone <= 0) {
      throw new Error("自習教材はページ数を指定して登録してください。");
    }
  }

  const dayRange = zonedDayRange(input.dateYmd);
  const dayDuplicate = await prisma.submission.findFirst({
    where: {
      bookletId: booklet.id,
      isVoid: false,
      timestamp: {
        gte: dayRange.start,
        lte: dayRange.end
      }
    },
    orderBy: {
      timestamp: "desc"
    }
  });

  if (dayDuplicate) {
    return {
      status: "duplicate",
      message: `${input.dateYmd} は既に提出済みです。`,
      submissionId: dayDuplicate.id
    } satisfies ScanResult;
  }

  const pointsAwarded = booklet.material.pointsPerSubmit;

  const createData: Prisma.SubmissionCreateInput = {
    timestamp: timestampInTokyoDate(input.dateYmd),
    booklet: { connect: { id: booklet.id } },
    classRoom: { connect: { id: booklet.student.classId } },
    material: { connect: { id: booklet.materialId } },
    student: { connect: { id: booklet.studentId } },
    pointsAwarded,
    pagesDone: materialMode === MaterialMode.self_study ? input.pagesDone : null
  };

  const created = await prisma.submission.create({ data: createData });

  const monthRange = currentMonthRange();

  const [cumulativeAgg, monthAgg] = await Promise.all([
    prisma.submission.aggregate({
      where: { studentId: booklet.studentId, isVoid: false },
      _sum: { pointsAwarded: true }
    }),
    prisma.submission.aggregate({
      where: {
        studentId: booklet.studentId,
        isVoid: false,
        timestamp: { gte: monthRange.start, lte: monthRange.end }
      },
      _sum: { pointsAwarded: true }
    })
  ]);

  return {
    status: "success",
    submissionId: created.id,
    studentName: booklet.student.displayName,
    materialName: booklet.material.name,
    pointsAwarded,
    cumulativePoints: cumulativeAgg._sum.pointsAwarded ?? 0,
    monthlyPoints: monthAgg._sum.pointsAwarded ?? 0,
    crcWarning: parsed.crcWarning
  } satisfies ScanResult;
}

export async function voidSubmission(submissionId: string, reason = "scan_undo") {
  const existing = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!existing) {
    throw new Error("提出記録が見つかりません。");
  }
  if (existing.isVoid) {
    return existing;
  }
  return prisma.submission.update({
    where: { id: submissionId },
    data: {
      isVoid: true,
      voidReason: reason
    }
  });
}
