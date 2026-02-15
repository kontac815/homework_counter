import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(error.issues.map((issue) => issue.message).join(" / "), 400);
  }

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return jsonError("認証が必要です。", 401);
    }
    return jsonError(error.message, 400);
  }

  return jsonError("不明なエラーが発生しました。", 500);
}
