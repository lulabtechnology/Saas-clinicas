import { verifyPreview } from "@/lib/preview";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params, searchParams }: { params: { slug: string; version: string }, searchParams: { token?: string } }) {
  const token = searchParams?.token || "";
  const ok = verifyPreview(token);
  if (!ok || ok.slug !== params.slug || String(ok.version) !== params.version) notFound();

  const admin = createSupabaseAdmin();
  const { data: t } = await admin.from("tenants").select("id, name, branding").eq("slug", params.slug).maybeSingle();
  if (!t) notFound();

  const { data: pub } = await admin
    .from("publishes")
    .select("snapshot")
    .eq("tenant_id", t.id)
    .eq("version", Number(params.version))
    .maybeSingle();
  if (!pub) notFound();

  const snap = pub.snapshot || {};
  const services = Array.isArray(snap.services) ? snap.services : [];
  const pros = Array.isArray(snap.professionals) ? snap.professionals : [];

  return (
    <main className="container py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Previsualización — {t.name}</h1>
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-2">Servicios (v{params.version})</h2>
        <ul className="list-disc pl-5">
          {services.map((s:any)=> <li key={s.id}>{s.name} — {s.duration_minutes} min — PAB {(s.price_cents/100).toFixed(2)}</li>)}
          {!services.length && <li className="text-slate-600">Sin servicios en este borrador.</li>}
        </ul>
        <h2 className="text-lg font-medium mt-6 mb-2">Profesionales</h2>
        <ul className="list-disc pl-5">
          {pros.map((p:any)=> <li key={p.id}>{p.full_name} — {p.specialty}</li>)}
          {!pros.length && <li className="text-slate-600">Sin profesionales en este borrador.</li>}
        </ul>
      </Card>
      <p className="text-sm text-slate-600">* Este link expira automáticamente. Uso interno.</p>
    </main>
  );
}
