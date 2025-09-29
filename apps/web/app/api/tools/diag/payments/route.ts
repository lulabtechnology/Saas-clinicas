export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const bookingId = url.searchParams.get("bookingId") ?? "";
    if (!bookingId) return NextResponse.json({ ok: false, error: "missing_bookingId" }, { status: 400 });

    const admin = createSupabaseAdmin();
    const { data: booking } = await admin
      .from("bookings")
      .select("id, tenant_id, status, price_cents")
      .eq("id", bookingId)
      .maybeSingle();

    const { data: payments } = await admin
      .from("payments")
      .select("id, status, provider, amount_cents, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ ok: true, booking, payments });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
