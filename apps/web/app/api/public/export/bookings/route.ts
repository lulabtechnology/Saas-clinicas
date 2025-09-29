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
    const status = url.searchParams.get("status") || "";

    if (!slug || !from || !to) return new NextResponse("params", { status: 400 });

    const admin = createSupabaseAdmin();

    const { data: tenant } = await admin.from("tenants").select("id, name, timezone").eq("slug", slug).maybeSingle();
    if (!tenant) return new NextResponse("tenant", { status: 404 });

    // Traer bookings + joins básicos
    const q = admin
      .from("bookings")
      .select("id, scheduled_at, status, price_cents, duration_minutes, patient_name, patient_phone, services:service_id(name), professionals:professional_id(full_name)")
      .eq("tenant_id", tenant.id)
      .gte("scheduled_at", new Date(from).toISOString())
      .lt("scheduled_at", new Date(new Date(to).getTime() + 24*60*60*1000).toISOString())
      .order("scheduled_at", { ascending: true });

    if (proId) q.eq("professional_id", proId);
    if (status) q.eq("status", status);

    const { data: bookings } = await q;

    const ids = (bookings ?? []).map((b:any)=> b.id);
    let payments: any[] = [];
    if (ids.length > 0) {
      const { data } = await admin
        .from("payments")
        .select("id, booking_id, status, amount_cents, created_at")
        .in("booking_id", ids);
      payments = data ?? [];
    }

    const paidByBooking = new Map<string, number>();
    for (const p of payments) {
      if (p.status === "succeeded") {
        paidByBooking.set(p.booking_id, (paidByBooking.get(p.booking_id) || 0) + (p.amount_cents || 0));
      }
    }

    const rows: string[] = [];
    // Encabezado
    rows.push([
      "booking_id",
      "fecha_local",
      "hora_local",
      "estado",
      "servicio",
      "profesional",
      "paciente",
      "telefono",
      "duracion_min",
      "precio_cents",
      "pagado_cents"
    ].join(","));

    for (const b of bookings ?? []) {
      const service = Array.isArray((b as any).services) ? (b as any).services[0]?.name : (b as any).services?.name;
      const pro = Array.isArray((b as any).professionals) ? (b as any).professionals[0]?.full_name : (b as any).professionals?.full_name;

      const dt = new Date(b.scheduled_at);
      const fecha = dt.toISOString().slice(0,10);
      const hora = dt.toISOString().slice(11,16);
      const paid = paidByBooking.get(b.id) || 0;

      const csvLine = [
        b.id,
        fecha,
        hora,
        b.status,
        safe(service),
        safe(pro ?? ""),
        safe(b.patient_name ?? ""),
        safe(b.patient_phone ?? ""),
        String(b.duration_minutes ?? 0),
        String(b.price_cents ?? 0),
        String(paid)
      ].join(",");
      rows.push(csvLine);
    }

    const csv = rows.join("\n");
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="bookings_${slug}_${from}_${to}.csv"`
      }
    });
  } catch (e:any) {
    return new NextResponse(`error,${e.message}`, { status: 500 });
  }
}

function safe(v: string) {
  const s = (v || "").replace(/"/g, '""');
  if (s.includes(",") || s.includes("\n")) return `"${s}"`;
  return s;
}
