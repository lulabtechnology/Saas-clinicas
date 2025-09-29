export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getMessagingProvider } from "@/lib/messaging/providers";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { bookingId } = body || {};
    if (!bookingId) return NextResponse.json({ ok: false, error: "missing_bookingId" }, { status: 400 });

    const provider = getMessagingProvider();
    const { messageId } = await provider.enqueueConfirmation(bookingId);

    return NextResponse.json({ ok: true, messageId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
