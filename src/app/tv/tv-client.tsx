"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
};

type RecentEvent = {
  id: string;
  studentName: string;
  materialName: string;
  points: number;
  timestamp: string;
};

type FeedResponse = {
  monthlyTop10: LeaderboardRow[];
  allTimeTop10: LeaderboardRow[];
  recentEvents: RecentEvent[];
};

function Board({ title, rows }: { title: string; rows: LeaderboardRow[] }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <h3 className="text-2xl font-black tracking-wide">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? <p className="text-base text-slate-500">データなし</p> : null}
        {rows.map((row) => (
          <div key={row.studentId} className="grid grid-cols-[42px_52px_1fr_70px] items-center rounded-lg bg-slate-100 px-2 py-2">
            <span className="text-xl font-extrabold">{row.rank}</span>
            <span className="text-lg">{row.number.toString().padStart(2, "0")}</span>
            <span className="truncate pr-2 text-lg font-bold">{row.studentName}</span>
            <span className="text-right text-xl font-black">{row.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentBoard({ rows }: { rows: RecentEvent[] }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <h3 className="text-2xl font-black tracking-wide">直近スキャン</h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? <p className="text-base text-slate-500">まだ提出がありません</p> : null}
        {rows.map((event) => (
          <div key={event.id} className="rounded-lg bg-emerald-50 px-3 py-2 text-lg font-bold text-emerald-800">
            {event.studentName} さん +{event.points}pt
            <div className="text-xs font-medium text-emerald-700">{event.materialName}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TVClient() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [data, setData] = useState<FeedResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("tv-mode");
    const preventContext = (event: MouseEvent) => {
      event.preventDefault();
    };
    document.addEventListener("contextmenu", preventContext);

    return () => {
      document.body.classList.remove("tv-mode");
      document.removeEventListener("contextmenu", preventContext);
    };
  }, []);

  useEffect(() => {
    void loadClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    void loadFeed(selectedClassId);
    const timer = setInterval(() => {
      void loadFeed(selectedClassId);
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedClassId]);

  async function loadClasses() {
    const response = await fetch("/api/classes");
    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "クラスの取得に失敗しました。");
      return;
    }

    const list = json.classes as ClassItem[];
    setClasses(list);

    const params = new URLSearchParams(window.location.search);
    const classFromQuery = params.get("class");
    if (classFromQuery && list.some((item) => item.id === classFromQuery)) {
      setSelectedClassId(classFromQuery);
      return;
    }

    if (list.length > 0) {
      setSelectedClassId(list[0].id);
    }
  }

  async function loadFeed(classId: string) {
    const response = await fetch(`/api/tv-feed?classId=${classId}`);
    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "TVデータの取得に失敗しました。");
      return;
    }
    setData(json as FeedResponse);
    setErrorText(null);
  }

  async function exitTvMode() {
    setPinError(null);
    const response = await fetch("/api/tv-exit-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });

    const json = await response.json();
    if (!response.ok) {
      setPinError(json.message ?? "PIN認証に失敗しました。");
      return;
    }

    setShowExitModal(false);
    router.push("/scan");
  }

  const selectedClass = useMemo(() => classes.find((item) => item.id === selectedClassId), [classes, selectedClassId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3">
        <div>
          <h2 className="text-2xl font-black">ランキングTV表示</h2>
          <p className="text-sm text-slate-600">5秒ごとに自動更新 / 終了にはPINが必要</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.year} {classItem.classCode} ({classItem.name})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void document.documentElement.requestFullscreen()}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            全画面表示
          </button>
          <button
            type="button"
            onClick={() => {
              setPin("");
              setPinError(null);
              setShowExitModal(true);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            先生用 戻る
          </button>
        </div>
      </div>

      {selectedClass ? (
        <p className="mb-3 text-sm font-semibold text-slate-700">
          表示中: {selectedClass.year} {selectedClass.classCode} ({selectedClass.name})
        </p>
      ) : null}

      {errorText ? <p className="mb-4 rounded-md bg-red-100 px-4 py-2 text-red-700">{errorText}</p> : null}

      {data ? (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
          <RecentBoard rows={data.recentEvents} />
          <Board title="月間 Top10" rows={data.monthlyTop10} />
          <Board title="累積 Top10" rows={data.allTimeTop10} />
        </div>
      ) : null}

      {showExitModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5">
            <h3 className="text-lg font-bold">TV表示を終了（先生用）</h3>
            <p className="mt-1 text-sm text-slate-600">PINを入力すると通常画面に戻ります。</p>
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="PIN"
            />
            {pinError ? <p className="mt-2 text-sm text-red-600">{pinError}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowExitModal(false)} className="rounded-md border px-3 py-2">
                キャンセル
              </button>
              <button type="button" onClick={() => void exitTvMode()} className="rounded-md bg-slate-900 px-4 py-2 text-white">
                戻る
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
