import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { TV_EXIT_PIN } from "@/lib/constants";
import { handleRouteError, jsonError } from "@/lib/http";

const schema = z.object({
  pin: z.string().min(1).max(20)
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const payload = schema.parse(await request.json());

    if (payload.pin !== TV_EXIT_PIN) {
      return jsonError("PINが正しくありません。", 401);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
