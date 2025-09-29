export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getPaymentsProvider } from "@/lib/payments/providers";
import { getMessagingProvider } from "@/lib/messaging/providers";

/**
 * Crea una reserva pública (multitenant) y opcionalmente procesa prepago (MOCK).
 * Flujo:
 *  - Valida tenant/servicio
 *  - Calcula timestamptz según timezone del tenant
 *  - Verifica conflictos de horario
 *  - Inserta booking (pending si prepago, sino confirmed)
 *  - Si prepago: createIntent + confirm (mock, 1–3s) => paid
 *  - Encola mensajes: confirmación inmediata + recordatorios 24h y 3h antes
 *
 * Body JSON esperado:
 * {
 *   "slug": string,
 *   "serviceId": string,
 *   "professionalId": string,
 *   "date": "YYYY-MM-DD",
 *   "time": "HH:MM",
 *   "patientName": string,
 *   "patientPhone": string,
 *   "prepay": boolean
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      slug,
      serviceId,
      professionalId,
      date,
      time,
      patientName,
      patientPhone,
      prepay,
    } = body || {};

    // Validación básica
    if (
      !slug ||
      !serviceId ||
      !professionalId ||
      !date ||
      !time ||
      !patientName ||
      !patientPhone
    ) {
      return NextResponse.json(
        { ok: false, error: "params" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    // 1) Tenant + service
    const { data: tenant, error: tErr } = await admin
      .from("tenants")
      .select("id, timezone")
      .eq("slug", slug)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!tenant) {
      return NextResponse.json({ ok: false, error: "tenant" }, { status: 404 });
    }

    const { data: service, error: sErr } = await admin
      .from("services")
      .select("id, duration_minutes, price_cents, is_active")
      .eq("id", serviceId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!service || service.is_active === false) {
      return NextResponse.json(
        { ok: false, error: "service" },
        { status: 404 }
      );
    }

    // 2) Convertir date+time a timestamptz local al tenant
    const { data: tsRow, error: tsErr } = await admin.rpc(
      "to_timestamptz_local",
      { p_date: date, p_time: time, p_tz: tenant.timezone }
    );
    if (tsErr) throw tsErr;
    const scheduled_at: string = tsRow as string;

    // 3) Verificar conflictos del slot
    const { data: clash, error: cErr } = await admin.rpc(
      "booking_slot_taken",
      {
        p_tenant_id: tenant.id,
        p_professional_id: professionalId,
        p_ts: scheduled_at,
        p_duration: service.duration_minutes,
      }
    );
    if (cErr) throw cErr;
    if (clash === true) {
      return NextResponse.json(
        { ok: false, error: "slot_taken" },
        { status: 409 }
      );
    }

    // 4) Insertar booking
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
        status: prepay ? "pending" : "confirmed",
      })
      .select("id, scheduled_at")
      .single();
    if (bkErr) throw bkErr;

    let paymentStatus:
      | "succeeded"
      | "requires_payment"
      | "failed"
      | "refunded"
      | undefined;

    // 5) Prepago (MOCK): intent + confirm (simula latencia 1–3s)
    if (prepay) {
      const payments = getPaymentsProvider();
      const { intentId } = await payments.createIntent(booking.id);
      const { status } = await payments.confirm(intentId);
      paymentStatus = status;
    }

    // 6) Encolar mensajería (no bloquea la reserva si falla)
    try {
      const messaging = getMessagingProvider();
      // Confirmación inmediata
      await messaging.enqueueConfirmation(booking.id);

      // Recordatorios 24h y 3h antes
      const ts = new Date(booking.scheduled_at).getTime();
      const r24 = new Date(ts - 24 * 60 * 60 * 1000).toISOString();
      const r3 = new Date(ts - 3 * 60 * 60 * 1000).toISOString();

      await messaging.scheduleReminder(booking.id, r24, 24);
      await messaging.scheduleReminder(booking.id, r3, 3);
    } catch (msgErr) {
      // Log no bloqueante (en Vercel)
      console.error("Messaging enqueue failed:", msgErr);
    }

    // Listo
    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      paymentStatus,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "error" },
      { status: 500 }
    );
  }
}
