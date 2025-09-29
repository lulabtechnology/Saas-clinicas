export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/public/availability?slug=&serviceId=&professionalId=&date=YYYY-MM-DD
 * Devuelve horarios disponibles (HH:MM) entre 08:00–18:00, paso 30min,
 * verificando choques con bookings existentes para ese profesional y duración del servicio.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || "";
    const serviceId = url.searchParams.get("serviceId") || "";
    const professionalId = url.searchParams.get("professionalId") || "";
    const date = url.searchParams.get("date") || "";

    if (!slug || !serviceId || !professionalId || !date) {
      return NextResponse.json({ ok: false, error: "params" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // Tenant + service (para duración)
    const { data: tenant } = await admin
      .from("tenants")
      .select("id, timezone")
      .eq("slug", slug)
      .maybeSingle();
    if (!tenant) return NextResponse.json({ ok: false, error: "tenant" }, { status: 404 });

    const { data: service } = await admin
      .from("services")
      .select("id, duration_minutes, is_active")
      .eq("id", serviceId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!service || service.is_active === false)
      return NextResponse.json({ ok: false, error: "service" }, { status: 404 });

    const duration = Number(service.duration_minutes || 30);

    // Generar slots del día: 08:00–18:00 cada 30min
    const OPEN = 8;   // 08:00
    const CLOSE = 18; // 18:00
    const STEP = 30;  // minutos

    const slots: string[] = [];
    for (let h = OPEN; h < CLOSE; h++) {
      for (let m = 0; m < 60; m += STEP) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        slots.push(`${hh}:${mm}`);
      }
    }

    // Traer bookings del profesional para ese día
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    // Nota: scheduled_at es timestamptz; aquí basta filtrar por el día en UTC (mock suficiente).
    const { data: bookings } = await admin
      .from("bookings")
      .select("id, scheduled_at, duration_minutes, professional_id")
      .eq("tenant_id", tenant.id)
      .eq("professional_id", professionalId)
      .gte("scheduled_at", dayStart.toISOString())
      .lte("scheduled_at", dayEnd.toISOString());

    const conflicts = (ts: Date) => {
      const start = ts.getTime();
      const end = start + duration * 60_000;
      for (const b of bookings || []) {
        const bs = new Date(b.scheduled_at).getTime();
        const be = bs + (Number(b.duration_minutes || duration) * 60_000);
        // overlap?
        if (start < be && end > bs) return true;
      }
      return false;
    };

    // Filtrar slots chocados
    const available: string[] = [];
    for (const t of slots) {
      // convertir date+time a timestamptz local de tenant (via RPC)
      const { data: tsRow, error: tsErr } = await admin.rpc("to_timestamptz_local", {
        p_date: date,
        p_time: t,
        p_tz: tenant.timezone,
      });
      if (tsErr) continue;
      const ts = new Date(tsRow as string);
      if (!conflicts(ts)) available.push(t);
    }

    return NextResponse.json({ ok: true, times: available });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
