"use client";

type Props = { slug: string; from: string; to: string; proId?: string };

export default function KpiChartsClient({ slug, from, to, proId }: Props) {
  // Mantengo versión simple (sin recharts) para evitar errores.
  // Si ya tienes tu componente previo con recharts, puedes conservarlo.
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-4 gap-3">
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-slate-500">Reservas</div>
          <div className="text-xl font-semibold">—</div>
        </div>
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-slate-500">% Pagadas</div>
          <div className="text-xl font-semibold">—</div>
        </div>
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-slate-500">% No-show</div>
          <div className="text-xl font-semibold">—</div>
        </div>
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-slate-500">Ingresos</div>
          <div className="text-xl font-semibold">—</div>
        </div>
      </div>
      <div className="text-xs text-slate-500">
        KPIs demo — rango {from} → {to} {proId ? `(pro: ${proId})` : ""}
      </div>
    </div>
  );
}
