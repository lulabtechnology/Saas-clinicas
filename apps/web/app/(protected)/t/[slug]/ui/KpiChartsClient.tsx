"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

export default function KpiChartsClient({ slug, from, to, proId }: { slug: string; from: string; to: string; proId?: string }) {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);

  useEffect(() => {
    const url = `/api/public/stats/kpis?slug=${encodeURIComponent(slug)}&from=${from}&to=${to}${proId ? `&proId=${proId}` : ""}`;
    fetch(url).then(r=>r.json()).then(j=>{
      if (j.ok) {
        setKpi(j.kpi);
        setSeries(j.series || []);
      }
    }).finally(()=>setLoading(false));
  }, [slug, from, to, proId]);

  if (loading) return <div className="text-sm text-slate-600">Cargando KPIs…</div>;
  if (!kpi) return <div className="text-sm text-red-600">No se pudieron cargar KPIs.</div>;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric title="Reservas" value={kpi.total} />
        <Metric title="% Pagadas" value={`${(kpi.paid_rate*100).toFixed(0)}%`} />
        <Metric title="% No-show" value={`${(kpi.no_show_rate*100).toFixed(0)}%`} />
        <Metric title="Ingresos" value={`PAB ${(kpi.revenue_cents/100).toFixed(2)}`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" />
              <Bar dataKey="paid" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="avg_lead_hours" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-slate-600">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
