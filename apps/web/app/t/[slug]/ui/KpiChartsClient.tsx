"use client";

import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

type Props = { slug: string; from: string; to: string; proId?: string };

type KpiResp = {
  ok: boolean;
  totals?: { bookings: number; paid_pct: number; no_show_pct: number; revenue_cents: number };
  series?: { bookings_daily: Array<{ date: string; value: number }>; revenue_daily: Array<{ date: string; value: number }> };
  error?: string;
};

function money(cents: number) { return `PAB ${(cents / 100).toFixed(2)}`; }

export default function KpiChartsClient({ slug, from, to, proId }: Props) {
  const [data, setData] = useState<KpiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr("");
        const qs = new URLSearchParams({ slug, from, to });
        if (proId) qs.set("proId", proId);
        const r = await fetch(`/api/public/kpis?${qs.toString()}`, { cache: "no-store" });
        const j: KpiResp = await r.json();
        if (!j.ok) setErr(j.error || "No fue posible cargar KPIs");
        setData(j);
      } catch (e: any) {
        setErr(e?.message || "Error de red");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, from, to, proId]);

  const totals = data?.totals;
  const bSeries = data?.series?.bookings_daily ?? [];
  const rSeries = data?.series?.revenue_daily ?? [];

  return (
    <div className="space-y-4">
      {loading && <div className="text-sm text-slate-500">Cargando KPIs…</div>}
      {!!err && <div className="text-sm text-red-600">{err}</div>}

      {/* Tarjetas */}
      <div className="grid md:grid-cols-4 gap-3">
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-slate-500">Reservas</div>
          <div className="text-xl font-semibold">{totals ? totals.bookings : "—"}</div>
        </div>
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-slate-500">% Pagadas</div>
          <div className="text-xl font-semibold">{totals ? `${totals.paid_pct}%` : "—"}</div>
        </div>
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-slate-500">% No-show</div>
          <div className="text-xl font-semibold">{totals ? `${totals.no_show_pct}%` : "—"}</div>
        </div>
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-slate-500">Ingresos</div>
          <div className="text-xl font-semibold">{totals ? money(totals.revenue_cents) : "—"}</div>
        </div>
      </div>

      {/* Gráfica: reservas por día */}
      <div className="rounded-2xl border p-3">
        <div className="text-sm font-medium mb-2">Reservas por día</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={bSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfica: ingresos por día */}
      <div className="rounded-2xl border p-3">
        <div className="text-sm font-medium mb-2">Ingresos por día</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={rSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v: any) => money(Number(v))} />
              <Line type="monotone" dataKey="value" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
