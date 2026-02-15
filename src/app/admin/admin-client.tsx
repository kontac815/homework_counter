"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function AdminClient({ today, userRole }: { today: string; userRole: UserRole }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [exportStart, setExportStart] = useState(today);
  const [exportEnd, setExportEnd] = useState(today);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPoints, setNewPoints] = useState(1);
  const [newMode, setNewMode] = useState<"normal" | "self_study">("normal");
  const [message, setMessage] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isAdmin = userRole === "admin";

  useEffect(() => {
    void loadClasses();
    void loadMaterials();
  }, []);

  const activeMaterials = useMemo(() => materials.filter((material) => material.isActive), [materials]);

  async function loadClasses() {
    const response = await fetch("/api/classes");
    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "クラス取得に失敗しました。");
      return;
    }

    const list = json.classes as ClassItem[];
    setClasses(list);
    if (list.length > 0) {
      setSelectedClassId(list[0].id);
    }
  }

  async function loadMaterials() {
    const response = await fetch("/api/materials");
    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "教材取得に失敗しました。");
      return;
    }
    const list = json.materials as MaterialItem[];
    setMaterials(list);
    if (list.length > 0) {
      setSelectedMaterialId((prev) => prev || list[0].id);
    }
  }

  async function updateMaterial(material: MaterialItem) {
    if (!isAdmin) return;
    const response = await fetch("/api/materials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: material.id,
        pointsPerSubmit: material.pointsPerSubmit,
        mode: material.mode,
        isActive: material.isActive,
        name: material.name
      })
    });

    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "教材更新に失敗しました。");
      return;
    }

    setMessage(`教材 ${material.code} を更新しました。`);
    setErrorText(null);
    await loadMaterials();
  }

  async function addMaterial() {
    if (!isAdmin) return;
    if (!newCode.trim() || !newName.trim()) {
      setErrorText("教材コードと教材名を入力してください。");
      return;
    }

    const response = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        pointsPerSubmit: newPoints,
        mode: newMode,
        isActive: true
      })
    });

    const json = await response.json();
    if (!response.ok) {
      setErrorText(json.message ?? "教材追加に失敗しました。");
      return;
    }

    setMessage(`教材 ${newCode.trim().toUpperCase()} を追加しました。`);
    setErrorText(null);
    setNewCode("");
    setNewName("");
    setNewPoints(1);
    setNewMode("normal");
    await loadMaterials();
  }

  function openQrPrint() {
    if (!selectedClassId || !selectedMaterialId) {
      setErrorText("クラスと教材を選択してください。");
      return;
    }
    window.open(`/admin/qr-print?classId=${selectedClassId}&materialId=${selectedMaterialId}`, "_blank");
  }

  function downloadExcel() {
    if (!selectedClassId) {
      setErrorText("クラスを選択してください。");
      return;
    }
    const url = `/api/export?classId=${selectedClassId}&start=${exportStart}&end=${exportEnd}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold">管理</h2>
        <p className="mt-1 text-sm text-slate-600">教材管理、QR印刷、Excel出力を行います。</p>

        <div className="mt-4 max-w-md">
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
        </div>
      </section>

      {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {errorText ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p> : null}

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-bold">教材ポイント設定</h3>
        {!isAdmin ? <p className="mt-2 text-sm text-slate-600">閲覧のみ（管理者のみ編集可能）</p> : null}

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-100 text-left">
                <th className="px-3 py-2">コード</th>
                <th className="px-3 py-2">教材名</th>
                <th className="px-3 py-2">1回pt</th>
                <th className="px-3 py-2">モード</th>
                <th className="px-3 py-2">有効</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr key={material.id} className="border-b">
                  <td className="px-3 py-2 font-semibold">{material.code}</td>
                  <td className="px-3 py-2">
                    <input
                      value={material.name}
                      disabled={!isAdmin}
                      onChange={(event) =>
                        setMaterials((prev) =>
                          prev.map((item) => (item.id === material.id ? { ...item, name: event.target.value } : item))
                        )
                      }
                      className="w-44 rounded-md border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={material.pointsPerSubmit}
                      disabled={!isAdmin}
                      onChange={(event) =>
                        setMaterials((prev) =>
                          prev.map((item) =>
                            item.id === material.id
                              ? { ...item, pointsPerSubmit: Math.max(0, Number(event.target.value) || 0) }
                              : item
                          )
                        )
                      }
                      className="w-20 rounded-md border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={material.mode}
                      disabled={!isAdmin}
                      onChange={(event) =>
                        setMaterials((prev) =>
                          prev.map((item) =>
                            item.id === material.id ? { ...item, mode: event.target.value as MaterialItem["mode"] } : item
                          )
                        )
                      }
                      className="rounded-md border border-slate-300 px-2 py-1"
                    >
                      <option value="normal">normal</option>
                      <option value="self_study">self_study</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={material.isActive}
                      disabled={!isAdmin}
                      onChange={(event) =>
                        setMaterials((prev) =>
                          prev.map((item) => (item.id === material.id ? { ...item, isActive: event.target.checked } : item))
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => void updateMaterial(material)}
                      className="rounded-md border px-3 py-1 hover:bg-slate-100 disabled:opacity-40"
                    >
                      保存
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin ? (
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-lg font-bold">教材を追加</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1 block font-medium">教材コード</span>
              <input
                value={newCode}
                onChange={(event) => setNewCode(event.target.value.toUpperCase())}
                placeholder="例: ENGLISH"
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">教材名</span>
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="例: 英語ワーク"
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">1回pt</span>
              <input
                type="number"
                min={0}
                max={100}
                value={newPoints}
                onChange={(event) => setNewPoints(Math.max(0, Number(event.target.value) || 0))}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">モード</span>
              <select
                value={newMode}
                onChange={(event) => setNewMode(event.target.value as "normal" | "self_study")}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="normal">normal</option>
                <option value="self_study">self_study</option>
              </select>
            </label>
          </div>
          <button type="button" onClick={() => void addMaterial()} className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-white">
            教材を追加
          </button>
        </section>
      ) : null}

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-bold">QRコード一覧印刷（A4）</h3>
        <p className="mt-1 text-sm text-slate-600">選択したクラス×教材のQRをA4一覧表示し、印刷できます。</p>

        <div className="mt-3 max-w-md">
          <label className="text-sm">
            <span className="mb-1 block font-medium">教材</span>
            <select
              value={selectedMaterialId}
              onChange={(event) => setSelectedMaterialId(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {activeMaterials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.code} {material.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="button" onClick={openQrPrint} className="mt-4 rounded-md bg-slate-800 px-4 py-2 text-white">
          QR一覧を開く（印刷用）
        </button>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-bold">Excel出力 (.xlsx)</h3>
        <p className="mt-1 text-sm text-slate-600">期間を指定して提出記録を出力します。</p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">開始日</span>
            <input
              type="date"
              value={exportStart}
              onChange={(event) => setExportStart(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">終了日</span>
            <input
              type="date"
              value={exportEnd}
              onChange={(event) => setExportEnd(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <button type="button" onClick={downloadExcel} className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-white">
          Excelをダウンロード
        </button>
      </section>
    </div>
  );
}
