export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, serviceId, professionalId, date, time, patientName, patientPhone, prepay } = body || {};
    if (!slug || !serviceId || !professionalId || !date || !time || !patientName || !patientPhone) {
      return NextResponse.json({ ok: false, error: "params" }, { status: 400 });
    }
    const admin = createSupabaseAdmin();

    // Tenant + service
    const { data: tenant } = await admin.from("tenants")
      .select("id, timezone").eq("slug", slug).maybeSingle();
    if (!tenant) return NextResponse.json({ ok: false, error: "tenant" }, { status: 404 });

    const { data: service } = await admin.from("services")
      .select("id, duration_minutes, price_cents, is_active")
      .eq("id", serviceId).eq("tenant_id", tenant.id).maybeSingle();
    if (!service || service.is_active === false)
      return NextResponse.json({ ok: false, error: "service" }, { status: 404 });

    // Calcular timestamptz de la cita desde date + time según timezone del tenant
    const { data: tsRow } = await admin.rpc("to_timestamptz_local", {
      p_date: date, p_time: time, p_tz: tenant.timezone
    });
    const scheduled_at: string = tsRow;

    // Verificar que el slot siga libre (lado servidor)
    const { data: clash } = await admin.rpc("booking_slot_taken", {
      p_tenant_id: tenant.id,
      p_professional_id: professionalId,
      p_ts: scheduled_at,
      p_duration: service.duration_minutes
    });
    if (clash === true) {
      return NextResponse.json({ ok: false, error: "slot_taken" }, { status: 409 });
    }

    // Crear booking
    const { data: booking, error: bkErr } = await admin
      .from("bookings")
      .insert({
        tenant_id: tenant.id,
        service_id: serviceId,
        professional_id: professionalId,
        scheduled_at,
        duration_minutes: service.duration_minutes,
        price_cents: service.price_cents,
        patient_name: patientName,
        patient_phone: patientPhone,
        status: prepay ? "pending" : "confirmed"
      })
      .select("id")
      .single();
    if (bkErr) throw bkErr;

    // Si prepago demo: crear payment y marcar paid
    if (prepay) {
      const { error: payErr } = await admin.from("payments").insert({
        tenant_id: tenant.id,
        booking_id: booking.id,
        amount_cents: service.price_cents,
        provider: "mock",
        status: "succeeded"
      });
      if (payErr) throw payErr;

      await admin.from("bookings").update({ status: "paid" }).eq("id", booking.id);
    }

    return NextResponse.json({ ok: true, bookingId: booking.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
