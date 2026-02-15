"use client";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-md bg-slate-900 px-4 py-2 text-white">
      印刷
    </button>
  );
}
