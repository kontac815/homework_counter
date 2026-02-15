import { prisma } from "@/lib/prisma";
import { currentMonthRange } from "@/lib/time";

export type LeaderboardRow = {
  rank: number;
  studentId: string;
  number: number;
  studentName: string;
  points: number;
  lastSubmittedAt: string | null;
};

async function buildTop10(classId: string, range?: { start: Date; end: Date }) {
  const where = {
    classId,
    isVoid: false,
    ...(range
      ? {
          timestamp: {
            gte: range.start,
            lte: range.end
          }
        }
      : {})
  };

  const groups = await prisma.submission.groupBy({
    by: ["studentId"],
    where,
    _sum: { pointsAwarded: true },
    _max: { timestamp: true },
    orderBy: [{ _sum: { pointsAwarded: "desc" } }, { _max: { timestamp: "asc" } }],
    take: 10
  });

  if (groups.length === 0) return [] as LeaderboardRow[];

  const students = await prisma.student.findMany({
    where: { id: { in: groups.map((group) => group.studentId) } },
    select: { id: true, number: true, displayName: true }
  });

  const studentMap = new Map(students.map((student) => [student.id, student]));

  return groups.map((group, index) => {
    const student = studentMap.get(group.studentId);
    return {
      rank: index + 1,
      studentId: group.studentId,
      number: student?.number ?? 0,
      studentName: student?.displayName ?? "不明",
      points: group._sum.pointsAwarded ?? 0,
      lastSubmittedAt: group._max.timestamp?.toISOString() ?? null
    };
  });
}

export async function getLeaderboards(classId: string) {
  const monthRange = currentMonthRange();

  const [monthlyTop10, allTimeTop10] = await Promise.all([
    buildTop10(classId, monthRange),
    buildTop10(classId)
  ]);

  return {
    monthlyTop10,
    allTimeTop10
  };
}

export async function getRecentEvents(classId: string, limit = 8) {
  const recent = await prisma.submission.findMany({
    where: { classId, isVoid: false },
    orderBy: { timestamp: "desc" },
    take: limit,
    include: {
      student: { select: { displayName: true } },
      material: { select: { name: true } }
    }
  });

  return recent.map((item) => ({
    id: item.id,
    studentName: item.student.displayName,
    materialName: item.material.name,
    points: item.pointsAwarded,
    timestamp: item.timestamp.toISOString()
  }));
}
