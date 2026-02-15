"use client";

import { useEffect, useState } from "react";

type ClassItem = {
  id: string;
  year: number;
  classCode: string;
  name: string;
};

type LeaderboardRow = {
  rank: number;
  studentId: string;
  number: number;
  studentName: string;
  points: number;
  lastSubmittedAt: string | null;
};

type LeaderboardResponse = {
  tieBreakRule: string;
  monthlyTop10: LeaderboardRow[];
  allTimeTop10: LeaderboardRow[];
};

function RankingTable({ title, rows }: { title: string; rows: LeaderboardRow[] }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="text-lg font-bold">{title}</h3>
      <table className="mt-3 min-w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-100 text-left">
            <th className="px-3 py-2">順位</th>
            <th className="px-3 py-2">番号</th>
            <th className="px-3 py-2">氏名</th>
            <th className="px-3 py-2">pt</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-2 text-slate-500" colSpan={4}>
                データがありません
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.studentId} className="border-b">
                <td className="px-3 py-2 font-semibold">{row.rank}</td>
                <td className="px-3 py-2">{row.number.toString().padStart(2, "0")}</td>
                <td className="px-3 py-2">{row.studentName}</td>
                <td className="px-3 py-2">{row.points}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function LeaderboardClient() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    void loadClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    void loadLeaderboard(selectedClassId);
  }, [selectedClassId]);

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

  async function loadLeaderboard(classId: string) {
    const response = await fetch(`/api/leaderboard?classId=${classId}`);
    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "ランキングの取得に失敗しました。");
      return;
    }
    setData(json as LeaderboardResponse);
    setErrorText(null);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold">ランキング</h2>
        <p className="mt-1 text-sm text-slate-600">月間Top10 と 累積Top10 を同時表示します。</p>

        <label className="mt-4 block max-w-md text-sm">
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

        {data ? <p className="mt-2 text-xs text-slate-500">同点時ルール: {data.tieBreakRule}</p> : null}
      </section>

      {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}

      {data ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <RankingTable title="月間 Top10" rows={data.monthlyTop10} />
          <RankingTable title="累積 Top10" rows={data.allTimeTop10} />
        </section>
      ) : null}
    </div>
  );
}
