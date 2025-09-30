import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || "";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const proId = url.searchParams.get("proId") || "";

    if (!slug || !from || !to) {
      return NextResponse.json({ ok: false, error: "slug, from y to son requeridos" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // 1) Tenant por slug
    const { data: tenant } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json({ ok: false, error: "Tenant no encontrado" }, { status: 404 });
    }

    // Fechas (to exclusivo)
    const start = new Date(from);
    const end = new Date(to);
    end.setDate(end.getDate() + 1);

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // 2) Bookings en rango
    let qB = admin
      .from("bookings")
      .select("id, scheduled_at, professional_id, status")
      .eq("tenant_id", tenant.id)
      .gte("scheduled_at", startISO)
      .lt("scheduled_at", endISO);

    if (proId) qB = qB.eq("professional_id", proId);

    const bookingsRes = await qB;
    const bookings: any[] = bookingsRes.data ?? [];

    // 3) Payments en rango (pagos exitosos)
    const paysRes = await admin
      .from("payments")
      .select("id, booking_id, amount_cents, status, created_at")
      .eq("tenant_id", tenant.id)
      .eq("status", "succeeded")
      .gte("created_at", startISO)
      .lt("created_at", endISO);

    const pays: any[] = paysRes.data ?? [];

    // Map de pagos por booking
    const paidByBooking = new Map<string, number>();
    let revenue_cents = 0;
    for (const p of pays) {
      if (p?.status === "succeeded") {
        const amt = Number(p?.amount_cents ?? 0);
        revenue_cents += amt;
        if (p?.booking_id) {
          const prev = paidByBooking.get(p.booking_id) || 0;
          paidByBooking.set(p.booking_id, prev + amt);
        }
      }
    }

    const total = bookings.length;
    const paid = bookings.filter(b => paidByBooking.has(b.id)).length;
    const noShow = bookings.filter(b => b.status === "no_show").length;

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n * 10000) / d) / 100 : 0);

    // Series por día
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);

    const bookingsDaily: Record<string, number> = {};
    for (const b of bookings) {
      const k = dayKey(new Date(b.scheduled_at));
      bookingsDaily[k] = (bookingsDaily[k] || 0) + 1;
    }

    const revenueDaily: Record<string, number> = {};
    for (const p of pays) {
      const k = dayKey(new Date(p.created_at));
      revenueDaily[k] = (revenueDaily[k] || 0) + Number(p?.amount_cents ?? 0);
    }

    const sortKeys = (obj: Record<string, number>) =>
      Object.keys(obj).sort().map(k => ({ date: k, value: obj[k] }));

    return NextResponse.json({
      ok: true,
      totals: {
        bookings: total,
        paid_pct: pct(paid, total),
        no_show_pct: pct(noShow, total),
        revenue_cents,
      },
      series: {
        bookings_daily: sortKeys(bookingsDaily),
        revenue_daily: sortKeys(revenueDaily),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
