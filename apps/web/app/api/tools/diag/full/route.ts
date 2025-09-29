export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // 1) ENV
    const env = {
      NEXT_PUBLIC_SITE_URL: !!process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      PAYMENTS_PROVIDER: process.env.PAYMENTS_PROVIDER || "mock",
      MESSAGING_PROVIDER: process.env.MESSAGING_PROVIDER || "mock",
      CRON_SECRET: !!process.env.CRON_SECRET,
    };

    // 2) DB básica
    const admin = createSupabaseAdmin();

    const [tenants, services, pros, bookings, payments, messages] = await Promise.all([
      admin.from("tenants").select("id", { count: "exact", head: true }),
      admin.from("services").select("id", { count: "exact", head: true }),
      admin.from("professionals").select("id", { count: "exact", head: true }),
      admin.from("bookings").select("id", { count: "exact", head: true }),
      admin.from("payments").select("id", { count: "exact", head: true }),
      admin.from("messages").select("id", { count: "exact", head: true }),
    ]);

    const counts = {
      tenants: tenants.count ?? 0,
      services: services.count ?? 0,
      professionals: pros.count ?? 0,
      bookings: bookings.count ?? 0,
      payments: payments.count ?? 0,
      messages: messages.count ?? 0,
    };

    // 3) RPCs clave
    const rpc = {
      to_timestamptz_local: null as null | string,
      booking_slot_taken: null as null | boolean,
    };

    const tzSample = "America/Panama";
    const dateSample = "2025-01-15";
    const timeSample = "09:30";

    const { data: tsRow, error: tsErr } = await admin.rpc("to_timestamptz_local", {
      p_date: dateSample,
      p_time: timeSample,
      p_tz: tzSample,
    });
    if (tsErr) throw tsErr;
    rpc.to_timestamptz_local = tsRow as string;

    // Para booking_slot_taken usamos datos dummy seguros (no debe tronar)
    const { data: anyTenant } = await admin.from("tenants").select("id").limit(1).maybeSingle();
    const { data: anyPro } = await admin.from("professionals").select("id").limit(1).maybeSingle();

    if (anyTenant && anyPro) {
      const { data: clash, error: cErr } = await admin.rpc("booking_slot_taken", {
        p_tenant_id: anyTenant.id,
        p_professional_id: anyPro.id,
        p_ts: rpc.to_timestamptz_local!,
        p_duration: 30,
      });
      if (!cErr) rpc.booking_slot_taken = clash as boolean;
    }

    // 4) Mensajes vencidos (cola)
    const { data: due } = await admin
      .from("messages")
      .select("id")
      .eq("status", "queued")
      .lte("to_send_at", new Date().toISOString())
      .limit(5);

    return NextResponse.json({
      ok: true,
      env,
      counts,
      rpc,
      messages_due_sample: (due ?? []).map((d) => d.id),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
