import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import PrintButton from "@/components/print-button";
import { canAccessClass } from "@/lib/access";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SearchParams = {
  classId?: string;
  materialId?: string;
};

function buildPayload(input: { year: number; classCode: string; number: number; materialCode: string }) {
  return `T4|BM|${input.year}|${input.classCode}|${input.number.toString().padStart(3, "0")}|${input.materialCode}`;
}

export default async function QrPrintPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login");
  }

  const classId = searchParams.classId;
  const materialId = searchParams.materialId;

  if (!classId || !materialId) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <p className="rounded-md bg-amber-50 px-4 py-3 text-amber-800">classId と materialId を指定してください。</p>
        <Link href="/admin" className="mt-4 inline-block rounded-md border px-4 py-2">
          管理画面へ戻る
        </Link>
      </div>
    );
  }

  const allowed = await canAccessClass(session.user.id, session.user.role, classId);
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <p className="rounded-md bg-red-50 px-4 py-3 text-red-700">このクラスのQR一覧を表示する権限がありません。</p>
        <Link href="/admin" className="mt-4 inline-block rounded-md border px-4 py-2">
          管理画面へ戻る
        </Link>
      </div>
    );
  }

  const [classRoom, material, students] = await Promise.all([
    prisma.schoolClass.findUnique({ where: { id: classId } }),
    prisma.material.findUnique({ where: { id: materialId } }),
    prisma.student.findMany({
      where: { classId },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        displayName: true
      }
    })
  ]);

  if (!classRoom || !material) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <p className="rounded-md bg-red-50 px-4 py-3 text-red-700">クラスまたは教材が見つかりません。</p>
        <Link href="/admin" className="mt-4 inline-block rounded-md border px-4 py-2">
          管理画面へ戻る
        </Link>
      </div>
    );
  }

  const labels = await Promise.all(
    students.map(async (student) => {
      const qrPayload = buildPayload({
        year: classRoom.year,
        classCode: classRoom.classCode,
        number: student.number,
        materialCode: material.code
      });

      const booklet = await prisma.booklet.upsert({
        where: { studentId_materialId: { studentId: student.id, materialId: material.id } },
        update: { qrPayload, isActive: true },
        create: {
          studentId: student.id,
          materialId: material.id,
          qrPayload,
          isActive: true
        }
      });

      const svg = await QRCode.toString(booklet.qrPayload, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
        width: 160
      });

      return {
        student,
        svg,
        qrPayload: booklet.qrPayload
      };
    })
  );

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-4 text-slate-900">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .a4-grid { gap: 2mm !important; }
          @page { size: A4 portrait; margin: 8mm; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-3">
        <div>
          <h1 className="text-lg font-bold">QR一覧印刷</h1>
          <p className="text-sm text-slate-600">
            {classRoom.year} {classRoom.classCode} / {material.name}
          </p>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <Link href="/admin" className="rounded-md border px-4 py-2">
            戻る
          </Link>
        </div>
      </div>

      <div className="a4-grid grid grid-cols-3 gap-2">
        {labels.map((label) => (
          <div key={label.student.id} className="break-inside-avoid rounded-md border p-2 text-center">
            <div className="mx-auto h-[42mm] w-[42mm]" dangerouslySetInnerHTML={{ __html: label.svg }} />
            <p className="mt-1 text-sm font-bold">
              {label.student.number.toString().padStart(2, "0")} {label.student.displayName}
            </p>
            <p className="text-xs text-slate-700">{material.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
