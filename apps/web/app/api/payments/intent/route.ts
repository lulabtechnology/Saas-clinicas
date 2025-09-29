export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getPaymentsProvider } from "@/lib/payments/providers";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { bookingId } = body || {};

    if (!bookingId) {
      return NextResponse.json({ ok: false, error: "missing_bookingId" }, { status: 400 });
    }

    // Validación básica: booking existe
    const admin = createSupabaseAdmin();
    const { data: booking } = await admin
      .from("bookings")
      .select("id")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return NextResponse.json({ ok: false, error: "booking_not_found" }, { status: 404 });

    const provider = getPaymentsProvider();
    const { intentId } = await provider.createIntent(bookingId);

    return NextResponse.json({ ok: true, intentId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
