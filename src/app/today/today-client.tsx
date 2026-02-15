"use client";

import { useEffect, useMemo, useState } from "react";

type ClassItem = {
  id: string;
  year: number;
  classCode: string;
  name: string;
};

type StatusRow = {
  studentId: string;
  number: number;
  displayName: string;
  submitted: boolean;
  timestamp: string | null;
  pointsAwarded: number;
};

type StatusResponse = {
  date: string;
  isSchoolDay: boolean;
  missingCount: number;
  rows: StatusRow[];
};

export default function TodayClient({ today }: { today: string }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    void loadClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId || !selectedDate) {
      setStatus(null);
      return;
    }
    void loadStatus(selectedClassId, selectedDate);
  }, [selectedClassId, selectedDate]);

  async function loadClasses() {
    const response = await fetch("/api/classes");
    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "クラスの取得に失敗しました。");
      return;
    }

    setClasses(json.classes);
    if (json.classes.length > 0) {
      setSelectedClassId(json.classes[0].id);
    }
  }

  async function loadStatus(classId: string, dateYmd: string) {
    const response = await fetch(`/api/today-status?classId=${classId}&date=${dateYmd}`);
    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "提出状況の取得に失敗しました。");
      setStatus(null);
      return;
    }
    setStatus(json as StatusResponse);
    setErrorText(null);
  }

  const sortedRows = useMemo(() => {
    if (!status) return [];
    return [...status.rows].sort((a, b) => a.number - b.number);
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold">日次の提出状況</h2>
        <p className="mt-1 text-sm text-slate-600">平日の未提出者を赤で表示します。日付は自由に変更できます。</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">クラス</span>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.year} {classItem.classCode} ({classItem.name})
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">日付</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      </div>

      {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}

      {status ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold">{status.date} の提出状況</h3>
            {status.isSchoolDay ? (
              <p className="rounded-md bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">未提出: {status.missingCount}人</p>
            ) : (
              <p className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">土日は提出対象外</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-100 text-left">
                  <th className="px-3 py-2">番号</th>
                  <th className="px-3 py-2">氏名</th>
                  <th className="px-3 py-2">提出時刻</th>
                  <th className="px-3 py-2">日次pt</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr
                    key={row.studentId}
                    className={status.isSchoolDay && !row.submitted ? "border-b bg-red-100" : "border-b"}
                  >
                    <td className="px-3 py-2">{row.number.toString().padStart(2, "0")}</td>
                    <td className="px-3 py-2">{row.displayName}</td>
                    <td className="px-3 py-2">{row.timestamp ? new Date(row.timestamp).toLocaleTimeString("ja-JP") : "-"}</td>
                    <td className="px-3 py-2">{row.submitted ? row.pointsAwarded : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
