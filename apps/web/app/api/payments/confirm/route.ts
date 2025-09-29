export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getPaymentsProvider } from "@/lib/payments/providers";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { intentId } = body || {};
    if (!intentId) return NextResponse.json({ ok: false, error: "missing_intentId" }, { status: 400 });

    const provider = getPaymentsProvider();
    const { status } = await provider.confirm(intentId);

    return NextResponse.json({ ok: true, status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
