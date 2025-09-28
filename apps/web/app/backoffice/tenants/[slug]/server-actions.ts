"use server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { signPreview } from "@/lib/preview";

export async function saveDraftAction(params: { tenantId: string; version: number; snapshot: any }) {
  try {
    const admin = createSupabaseAdmin();
    // upsert del draft por version (si existe, update; si no, insert)
    const { data: existing } = await admin
      .from("publishes")
      .select("id, version, status")
      .eq("tenant_id", params.tenantId)
      .eq("version", params.version)
      .maybeSingle();

    if (!existing) {
      await admin.from("publishes").insert({
        tenant_id: params.tenantId,
        version: params.version,
        status: "draft",
        snapshot: params.snapshot
      });
    } else {
      if (existing.status !== "draft") {
        return { ok: false, error: "La versión ya no está en borrador." };
      }
      await admin.from("publishes").update({ snapshot: params.snapshot }).eq("tenant_id", params.tenantId).eq("version", params.version);
    }

    // Actualiza info básica en tenants (nombre/tz/branding) para referencia
    const c = params.snapshot?.clinic ?? {};
    await admin.from("tenants").update({
      name: c.name ?? undefined,
      timezone: c.timezone ?? undefined,
      branding: c.branding ?? undefined
    }).eq("id", params.tenantId);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function previewLinkAction(params: { slug: string; version: number }) {
  try {
    const exp = Date.now() + 1000 * 60 * 30; // 30 min
    const token = signPreview({ slug: params.slug, version: params.version, exp });
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/p/${params.slug}/${params.version}?token=${token}`;
    return { ok: true, url };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function publishAction(params: { tenantId: string; slug: string; version: number }) {
  const admin = createSupabaseAdmin();
  try {
    // 1) Obtener snapshot de la versión en draft
    const { data: pub, error } = await admin
      .from("publishes").select("id, status, snapshot")
      .eq("tenant_id", params.tenantId).eq("version", params.version).maybeSingle();
    if (error) throw error;
    if (!pub) return { ok: false, error: "No existe el borrador." };
    if (pub.status !== "draft") return { ok: false, error: "La versión no está en borrador." };

    const snap = pub.snapshot || {};
    const services = Array.isArray(snap.services) ? snap.services : [];
    const pros = Array.isArray(snap.professionals) ? snap.professionals : [];
    const clinic = snap.clinic || {};

    // 2) Aplicar snapshot a tablas activas (no atómico, pero ordenado)
    await admin.from("services").delete().eq("tenant_id", params.tenantId);
    await admin.from("professionals").delete().eq("tenant_id", params.tenantId);

    if (pros.length) {
      const toIns = pros.map((p: any) => ({
        id: p.id, tenant_id: params.tenantId,
        full_name: p.full_name, specialty: p.specialty,
        calendar_color: p.calendar_color, is_active: p.is_active !== false
      }));
      await admin.from("professionals").insert(toIns);
    }

    if (services.length) {
      const toIns = services.map((s: any) => ({
        id: s.id, tenant_id: params.tenantId,
        name: s.name, description: s.description ?? null,
        duration_minutes: Number(s.duration_minutes ?? 30),
        price_cents: Number(s.price_cents ?? 0),
        is_active: s.is_active !== false
      }));
      await admin.from("services").insert(toIns);
    }

    // 3) Actualizar branding/clinic visibles
    await admin.from("tenants").update({
      name: clinic.name ?? undefined,
      timezone: clinic.timezone ?? undefined,
      branding: clinic.branding ?? undefined
    }).eq("id", params.tenantId);

    // 4) Marcar published/archivar anteriores
    const { data: currentPublished } = await admin
      .from("publishes").select("version").eq("tenant_id", params.tenantId).eq("status", "published").maybeSingle();
    if (currentPublished) {
      await admin.from("publishes").update({ status: "archived" })
        .eq("tenant_id", params.tenantId).eq("version", currentPublished.version);
    }
    await admin.from("publishes").update({ status: "published", published_at: new Date().toISOString() })
      .eq("tenant_id", params.tenantId).eq("version", params.version);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
