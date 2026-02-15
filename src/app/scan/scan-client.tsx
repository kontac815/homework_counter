"use client";

import confetti from "canvas-confetti";
import { FormEvent, useEffect, useRef, useState } from "react";
import { parseQrPayload } from "@/lib/qr";

type UserRole = "admin" | "teacher";

type ClassItem = {
  id: string;
  year: number;
  classCode: string;
  name: string;
};

type MaterialItem = {
  id: string;
  code: string;
  name: string;
  pointsPerSubmit: number;
  mode: "normal" | "self_study";
  isActive: boolean;
};

type StudentItem = {
  id: string;
  number: number;
  displayName: string;
};

type ScanResult =
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
      canCreateBooklet: boolean;
      parsed?: {
        year: number;
        classCode: string;
        number: number;
        materialCode: string;
        normalizedPayload: string;
      };
    };

type LastSuccess = {
  submissionId: string;
  studentName: string;
  materialName: string;
  pointsAwarded: number;
  cumulativePoints: number;
  monthlyPoints: number;
  crcWarning?: string;
};

function isWeekdayYmd(ymd: string) {
  const day = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

export default function ScanClient({ today, userRole }: { today: string; userRole: UserRole }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [scanInput, setScanInput] = useState("");
  const [pendingRawPayload, setPendingRawPayload] = useState<string | null>(null);

  const [pagesDone, setPagesDone] = useState<number>(1);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSuccess, setLastSuccess] = useState<LastSuccess | null>(null);
  const [showSelfStudyModal, setShowSelfStudyModal] = useState(false);

  const [showRescueModal, setShowRescueModal] = useState(false);
  const [rescueStudentId, setRescueStudentId] = useState("");
  const [rescueMaterialId, setRescueMaterialId] = useState("");
  const [rescueQrPayload, setRescueQrPayload] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      inputRef.current?.focus();
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    void loadClasses();
    void loadMaterials();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    void loadStudents(selectedClassId);
  }, [selectedClassId]);

  async function loadClasses() {
    const response = await fetch("/api/classes");
    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "クラス取得に失敗しました。");
      return;
    }

    setClasses(json.classes);
    if (!selectedClassId && json.classes.length > 0) {
      setSelectedClassId(json.classes[0].id);
    }
  }

  async function loadMaterials() {
    const response = await fetch("/api/materials");
    const json = await response.json();
    if (response.ok) {
      setMaterials((json.materials as MaterialItem[]).filter((item) => item.isActive));
    }
  }

  async function loadStudents(classId: string) {
    const response = await fetch(`/api/students?classId=${classId}`);
    const json = await response.json();
    if (response.ok) {
      setStudents(json.students as StudentItem[]);
    }
  }

  function handleScanInputChange(value: string) {
    setScanInput(value);
    if (value.includes("\n") || value.includes("\r")) {
      const raw = value;
      setScanInput("");
      void onScanConfirmed(raw);
    }
  }

  async function onScanConfirmed(rawPayload: string) {
    setErrorText(null);
    if (!selectedClassId) {
      setErrorText("先にクラスを選択してください。");
      inputRef.current?.focus();
      return;
    }

    if (!isWeekdayYmd(selectedDate)) {
      setErrorText("土日は提出登録できません。平日の日付を選択してください。");
      inputRef.current?.focus();
      return;
    }

    try {
      const parsed = parseQrPayload(rawPayload);
      const material = materials.find((item) => item.code === parsed.materialCode);
      if (material?.mode === "self_study") {
        setPendingRawPayload(rawPayload);
        setPagesDone(1);
        setShowSelfStudyModal(true);
        return;
      }
    } catch {
      // QR不正はサーバ側で詳細メッセージを返す
    }

    await submitScan(rawPayload);
  }

  async function submitScan(rawPayload: string, customPagesDone?: number) {
    setLoading(true);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawPayload,
          classId: selectedClassId,
          dateYmd: selectedDate,
          pagesDone: customPagesDone
        })
      });

      const json = await response.json();
      if (!response.ok) {
        setErrorText(json.message ?? "スキャン登録に失敗しました。");
        return;
      }

      const result = json.result as ScanResult;
      if (result.status === "success") {
        setLastSuccess({
          submissionId: result.submissionId,
          studentName: result.studentName,
          materialName: result.materialName,
          pointsAwarded: result.pointsAwarded,
          cumulativePoints: result.cumulativePoints,
          monthlyPoints: result.monthlyPoints,
          crcWarning: result.crcWarning
        });
        confetti({
          particleCount: 120,
          spread: 75,
          origin: { y: 0.6 }
        });
        return;
      }

      if (result.status === "duplicate") {
        setErrorText(result.message);
        return;
      }

      if (result.status === "not_found") {
        setErrorText(result.message);
        if (userRole === "admin" && result.parsed) {
          setRescueQrPayload(result.parsed.normalizedPayload);
          const guessedStudent = students.find((student) => student.number === result.parsed?.number);
          const guessedMaterial = materials.find((material) => material.code === result.parsed?.materialCode);
          setRescueStudentId(guessedStudent?.id ?? "");
          setRescueMaterialId(guessedMaterial?.id ?? "");
          setShowRescueModal(true);
        }
      }
    } finally {
      setLoading(false);
      setScanInput("");
      inputRef.current?.focus();
    }
  }

  async function undoLastSubmission() {
    if (!lastSuccess) return;
    const response = await fetch(`/api/submissions/${lastSuccess.submissionId}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "scan_undo" })
    });
    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "取消に失敗しました。");
      return;
    }
    setErrorText("直前の提出を取り消しました。");
    setLastSuccess(null);
  }

  async function createBookletAndRetry(event: FormEvent) {
    event.preventDefault();
    if (!rescueStudentId || !rescueMaterialId || !rescueQrPayload) {
      setErrorText("冊子登録に必要な項目を選択してください。");
      return;
    }

    const response = await fetch("/api/booklets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: rescueStudentId,
        materialId: rescueMaterialId,
        qrPayload: rescueQrPayload
      })
    });

    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "冊子登録に失敗しました。");
      return;
    }

    setShowRescueModal(false);
    setErrorText("冊子を登録しました。もう一度スキャンしてください。");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold">スキャン登録（平日運用）</h2>
        <p className="mt-1 text-sm text-slate-600">入力欄は常時フォーカスされます。土日は登録不可です。</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">クラス</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
            >
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.year} {classItem.classCode} ({classItem.name})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">提出日</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        {!isWeekdayYmd(selectedDate) ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">この日付は土日です。提出対象外です。</p>
        ) : null}

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium" htmlFor="scanner-input">
            スキャナ入力欄（HID）
          </label>
          <input
            id="scanner-input"
            ref={inputRef}
            value={scanInput}
            onChange={(event) => handleScanInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const raw = scanInput;
                setScanInput("");
                void onScanConfirmed(raw);
              }
            }}
            onBlur={() => inputRef.current?.focus()}
            className="w-full rounded-md border-2 border-primary-500 px-3 py-3 text-lg"
            placeholder="ここにカーソルを置いたままスキャン"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={loading || !isWeekdayYmd(selectedDate)}
          />
        </div>

        {errorText ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}
      </section>

      {lastSuccess ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-lg font-bold text-emerald-800">ポイントゲット</h3>
          <div className="mt-2 grid gap-1 text-sm text-emerald-900 md:grid-cols-2">
            <p>生徒: {lastSuccess.studentName}</p>
            <p>教材: {lastSuccess.materialName}</p>
            <p>獲得: +{lastSuccess.pointsAwarded}pt</p>
            <p>累積: {lastSuccess.cumulativePoints}pt</p>
            <p>当月: {lastSuccess.monthlyPoints}pt</p>
          </div>
          {lastSuccess.crcWarning ? <p className="mt-2 text-sm text-amber-700">警告: {lastSuccess.crcWarning}</p> : null}
          <button
            type="button"
            onClick={() => void undoLastSubmission()}
            className="mt-3 rounded-md border border-emerald-400 px-3 py-1.5 text-sm hover:bg-emerald-100"
          >
            直前の1件を取消
          </button>
        </section>
      ) : null}

      {showSelfStudyModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <h3 className="text-lg font-bold">自習ページ数を入力</h3>
            <p className="mt-1 text-sm text-slate-600">QR読取後にページ数を確定して登録します。</p>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPagesDone((prev) => Math.max(1, prev - 1))}
                className="rounded-md border px-3 py-2"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={500}
                value={pagesDone}
                onChange={(event) => setPagesDone(Math.max(1, Number(event.target.value) || 1))}
                className="w-24 rounded-md border border-slate-300 px-3 py-2 text-center"
              />
              <button
                type="button"
                onClick={() => setPagesDone((prev) => Math.min(500, prev + 1))}
                className="rounded-md border px-3 py-2"
              >
                +
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-2"
                onClick={() => {
                  setShowSelfStudyModal(false);
                  setPendingRawPayload(null);
                  inputRef.current?.focus();
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="rounded-md bg-primary-600 px-4 py-2 text-white"
                onClick={() => {
                  if (!pendingRawPayload) return;
                  setShowSelfStudyModal(false);
                  void submitScan(pendingRawPayload, pagesDone);
                  setPendingRawPayload(null);
                }}
              >
                この内容で登録
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRescueModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <form className="w-full max-w-lg rounded-xl bg-white p-5" onSubmit={createBookletAndRetry}>
            <h3 className="text-lg font-bold">未登録QRの救済登録（管理者）</h3>
            <p className="mt-1 text-sm text-slate-600">この場で生徒と教材を選び、冊子を登録します。</p>

            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-medium">生徒</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={rescueStudentId}
                onChange={(event) => setRescueStudentId(event.target.value)}
                required
              >
                <option value="">選択してください</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.number.toString().padStart(2, "0")} {student.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-medium">教材</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={rescueMaterialId}
                onChange={(event) => setRescueMaterialId(event.target.value)}
                required
              >
                <option value="">選択してください</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.code} {material.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-medium">QR文字列</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={rescueQrPayload}
                onChange={(event) => setRescueQrPayload(event.target.value)}
                required
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-2"
                onClick={() => {
                  setShowRescueModal(false);
                  inputRef.current?.focus();
                }}
              >
                閉じる
              </button>
              <button type="submit" className="rounded-md bg-primary-600 px-4 py-2 text-white">
                冊子登録
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
