import { PrismaClient, MaterialMode, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const loginId = process.env.SEED_ADMIN_LOGIN_ID ?? "teacher01";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "password123";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { loginId },
    update: { passwordHash, role: UserRole.admin },
    create: { loginId, passwordHash, role: UserRole.admin }
  });

  const classRoom = await prisma.schoolClass.upsert({
    where: { year_classCode: { year: 2026, classCode: "3A" } },
    update: { name: "3年A組" },
    create: { year: 2026, classCode: "3A", name: "3年A組" }
  });

  const materialSeeds = [
    { code: "KANJI", name: "漢字ドリル", pointsPerSubmit: 1, mode: MaterialMode.normal },
    { code: "KEISAN", name: "計算ドリル", pointsPerSubmit: 1, mode: MaterialMode.normal },
    { code: "ONDOKU", name: "音読", pointsPerSubmit: 1, mode: MaterialMode.normal },
    { code: "SELF", name: "自習", pointsPerSubmit: 1, mode: MaterialMode.self_study }
  ];

  for (const material of materialSeeds) {
    await prisma.material.upsert({
      where: { code: material.code },
      update: material,
      create: material
    });
  }

  for (let number = 1; number <= 20; number += 1) {
    await prisma.student.upsert({
      where: {
        classId_number: { classId: classRoom.id, number }
      },
      update: {
        displayName: `生徒${number.toString().padStart(2, "0")}`
      },
      create: {
        classId: classRoom.id,
        number,
        displayName: `生徒${number.toString().padStart(2, "0")}`
      }
    });
  }

  const students = await prisma.student.findMany({ where: { classId: classRoom.id } });
  const materials = await prisma.material.findMany({ where: { isActive: true } });

  for (const student of students) {
    for (const material of materials) {
      const qrPayload = `T4|BM|2026|3A|${student.number.toString().padStart(3, "0")}|${material.code}`;
      await prisma.booklet.upsert({
        where: { studentId_materialId: { studentId: student.id, materialId: material.id } },
        update: { qrPayload },
        create: {
          studentId: student.id,
          materialId: material.id,
          qrPayload
        }
      });
    }
  }

  console.log(`Seed completed. Login: ${loginId} / ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
