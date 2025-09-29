export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || "";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const proId = url.searchParams.get("proId") || "";

    if (!slug || !from || !to) return NextResponse.json({ ok: false, error: "params" }, { status: 400 });

    const admin = createSupabaseAdmin();

    const { data: tenant } = await admin.from("tenants").select("id, timezone").eq("slug", slug).maybeSingle();
    if (!tenant) return NextResponse.json({ ok: false, error: "tenant" }, { status: 404 });

    // Traer bookings del rango
    const bq = admin
      .from("bookings")
      .select("id, status, scheduled_at, created_at")
      .eq("tenant_id", tenant.id)
      .gte("scheduled_at", new Date(from).toISOString())
      .lt("scheduled_at", new Date(new Date(to).getTime() + 24*60*60*1000).toISOString());

    if (proId) bq.eq("professional_id", proId);
    const { data: bookings } = await bq;

    const ids = (bookings ?? []).map(b => b.id);
    let payments: any[] = [];
    if (ids.length > 0) {
      const { data } = await admin
        .from("payments")
        .select("id, booking_id, status, amount_cents")
        .in("booking_id", ids);
      payments = data ?? [];
    }

    const byDay: Record<string, { total:number; paid:number; lead_sum:number; lead_n:number }> = {};
    let total = 0, paid = 0, noshow = 0, cancelled = 0, revenue = 0, leadSumH = 0, leadN = 0;

    const paidByBooking = new Map<string, number>();
    for (const p of payments) {
      if (p.status === "succeeded") {
        paidByBooking.set(p.booking_id, (paidByBooking.get(p.booking_id) || 0) + (p.amount_cents || 0));
      }
    }

    for (const b of bookings ?? []) {
      const day = new Date(b.scheduled_at).toISOString().slice(0,10);
      total++;

      if (!byDay[day]) byDay[day] = { total:0, paid:0, lead_sum:0, lead_n:0 };
      byDay[day].total++;

      if (b.status === "paid") { paid++; byDay[day].paid++; }
      if (b.status === "no_show") noshow++;
      if (b.status === "cancelled") cancelled++;

      // revenue por cita según payments succeeded (si hay)
      const pr = paidByBooking.get(b.id) || 0;
      revenue += pr;

      // lead time en horas
      if (b.created_at && b.scheduled_at) {
        const leadH = (new Date(b.scheduled_at).getTime() - new Date(b.created_at).getTime()) / 36e5;
        leadSumH += leadH;
        leadN++;
        byDay[day].lead_sum += leadH;
        byDay[day].lead_n++;
      }
    }

    const paid_rate = total > 0 ? paid / total : 0;
    const serviced = total - cancelled;
    const no_show_rate = serviced > 0 ? noshow / serviced : 0;
    const avg_lead_hours = leadN > 0 ? leadSumH / leadN : 0;

    // Serie por día
    const series = Object.keys(byDay).sort().map(day => ({
      day,
      total: byDay[day].total,
      paid: byDay[day].paid,
      avg_lead_hours: byDay[day].lead_n > 0 ? byDay[day].lead_sum / byDay[day].lead_n : 0
    }));

    return NextResponse.json({
      ok: true,
      kpi: {
        total,
        paid,
        paid_rate,
        noshow,
        no_show_rate,
        cancelled,
        revenue_cents: revenue,
        avg_lead_hours
      },
      series
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 500 });
  }
}
