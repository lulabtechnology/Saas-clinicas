import { isPlatformAdmin, requireSession } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BackofficeHome() {
  await requireSession();
  const ok = await isPlatformAdmin();
  if (!ok) {
    return (
      <main className="container py-10">
        <h1 className="text-2xl font-semibold">Acceso denegado</h1>
        <p className="text-slate-600">Esta sección es solo para el staff de plataforma.</p>
      </main>
    );
  }
  const supabase = createSupabaseServer();
  const { data: tenants } = await supabase.from("tenants").select("id, slug, name, timezone, is_enabled").order("created_at", { ascending: false });

  return (
    <main className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Backoffice — Clínicas</h1>
        <Link href="/backoffice/tenants/new"><Button>+ Nueva Clínica</Button></Link>
      </div>

      <Card className="p-6">
        <div className="grid gap-3">
          {tenants?.map(t => (
            <div key={t.id} className="flex items-center justify-between border rounded-2xl p-4">
              <div>
                <div className="font-medium">{t.name} <span className="text-xs text-slate-500">({t.slug})</span></div>
                <div className="text-sm text-slate-600">TZ: {t.timezone} · {t.is_enabled ? "Habilitada" : "Deshabilitada"}</div>
              </div>
              <div className="flex gap-2">
                <Link href={`/backoffice/tenants/${t.slug}`}><Button variant="outline">Editar</Button></Link>
                <Link href={`/t/${t.slug}`}><Button variant="ghost">Abrir dashboard</Button></Link>
              </div>
            </div>
          ))}
          {!tenants?.length && <div className="text-sm text-slate-600">No hay clínicas aún.</div>}
        </div>
      </Card>
    </main>
  );
}
