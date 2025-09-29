export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { buildSlotsForDay } from "@/lib/booking/slots";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const professionalId = url.searchParams.get("professionalId");
    const serviceId = url.searchParams.get("serviceId");
    const date = url.searchParams.get("date"); // YYYY-MM-DD

    if (!slug || !professionalId || !serviceId || !date) {
      return NextResponse.json({ ok: false, error: "params" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // Tenant + service
    const { data: tenant } = await admin.from("tenants")
      .select("id, timezone").eq("slug", slug).maybeSingle();
    if (!tenant) return NextResponse.json({ ok: false, error: "tenant" }, { status: 404 });

    const { data: service } = await admin.from("services")
      .select("id, duration_minutes, is_active").eq("id", serviceId).eq("tenant_id", tenant.id).maybeSingle();
    if (!service || service.is_active === false)
      return NextResponse.json({ ok: false, error: "service" }, { status: 404 });

    // Disponibilidad del día de la semana
    const weekday = new Date(date + "T00:00:00Z").getUTCDay(); // 0..6
    const { data: avail } = await admin.from("availability")
      .select("weekday, start_time, end_time, slot_size_minutes")
      .eq("tenant_id", tenant.id).eq("professional_id", professionalId).eq("weekday", weekday);
    const dayAvail = (avail ?? []).map(a => ({
      weekday: a.weekday as number,
      start_time: a.start_time as string,
      end_time: a.end_time as string,
      slot_size_minutes: a.slot_size_minutes as number,
    }));

    // Bookings existentes ese día para el pro (bloquea todo lo que no esté cancelado)
    const { data: bks } = await admin.rpc("bookings_for_day", {
      p_tenant_id: tenant.id,
      p_professional_id: professionalId,
      p_date: date
    });
    const existing = (bks ?? []).map((b: any) => ({ start: b.hhmm_start as string, end: b.hhmm_end as string }));

    const slots = buildSlotsForDay(dayAvail, service.duration_minutes, existing);

    return NextResponse.json({
      ok: true,
      timezone: tenant.timezone,
      slots // ["09:00","09:15",...]
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
