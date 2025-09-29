import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

// Mini util
function fmtDate(d: Date) { return d.toISOString().slice(0,10); }

export default async function ReservarPage({ params }: { params: { slug: string } }) {
  const admin = createSupabaseAdmin();

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, timezone, slug")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!tenant) return <main className="container py-10">Clínica no encontrada.</main>;

  const { data: services } = await admin
    .from("services")
    .select("id, name, price_cents, duration_minutes, is_active")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("name");

  const { data: pros } = await admin
    .from("professionals")
    .select("id, full_name, is_active")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("full_name");

  return (
    <main className="container py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Reservar — {tenant.name}</h1>
      <Card className="p-4">
        <BookingClient
          slug={tenant.slug}
          services={services ?? []}
          pros={pros ?? []}
        />
      </Card>
    </main>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";

function money(cents:number){ return `PAB ${(cents/100).toFixed(2)}`; }

function BookingClient({
  slug,
  services,
  pros
}:{
  slug: string;
  services: any[];
  pros: any[];
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [proId, setProId] = useState(pros[0]?.id || "");
  const [date, setDate] = useState(fmtDate(new Date()));
  const [times, setTimes] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [prepay, setPrepay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const service = useMemo(()=> services.find(s=>s.id===serviceId), [services, serviceId]);
  const pro = useMemo(()=> pros.find(p=>p.id===proId), [pros, proId]);

  // Cargar horarios disponibles al cambiar filtros
  useEffect(()=>{
    (async ()=>{
      setMsg("");
      setTimes([]);
      setTime("");
      if (!slug || !serviceId || !proId || !date) return;
      try {
        const url = `/api/public/availability?slug=${encodeURIComponent(slug)}&serviceId=${serviceId}&professionalId=${proId}&date=${date}`;
        const r = await fetch(url, { cache: "no-store" });
        const j = await r.json();
        if (j.ok && Array.isArray(j.times)) {
          setTimes(j.times);
          if (j.times.length === 0) {
            setMsg("No hay horarios disponibles para esa fecha. Puedes escribir una hora manual abajo.");
          }
        } else {
          setMsg("No fue posible obtener horarios. Intenta de nuevo o escribe una hora manual.");
        }
      } catch {
        setMsg("Error cargando horarios. Intenta de nuevo o escribe una hora manual.");
      }
    })();
  }, [slug, serviceId, proId, date]);

  const submit = async () => {
    setLoading(true);
    setMsg("");
    try {
      // Si no hay "time" seleccionado de la lista, usa el campo manual (si el usuario lo puso)
      let pickTime = time;
      if (!pickTime) {
        // intenta leer de input manual
        const manual = (document.getElementById("manual-time") as HTMLInputElement | null)?.value || "";
        if (manual) pickTime = manual;
      }
      if (!slug || !serviceId || !proId || !date || !pickTime || !patientName || !patientPhone) {
        setMsg("Completa todos los campos (incluye hora).");
        setLoading(false);
        return;
      }

      const r = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          serviceId,
          professionalId: proId,
          date,
          time: pickTime,
          patientName,
          patientPhone,
          prepay
        })
      });
      const j = await r.json();
      if (!j.ok) {
        setMsg(j.error || "No se pudo crear la reserva.");
        setLoading(false);
        return;
      }
      // Redirige a confirmación
      window.location.href = `/t/${slug}/confirmacion/${j.bookingId}`;
    } catch (e:any) {
      setMsg(e.message || "Error al reservar.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Servicio</label>
          <select className="border rounded-2xl px-3 py-2 w-full"
                  value={serviceId} onChange={e=>setServiceId(e.target.value)}>
            {services.map((s:any)=>(
              <option key={s.id} value={s.id}>
                {s.name} · {money(s.price_cents)} · {s.duration_minutes}min
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm">Profesional</label>
          <select className="border rounded-2xl px-3 py-2 w-full"
                  value={proId} onChange={e=>setProId(e.target.value)}>
            {pros.map((p:any)=>(
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm">Fecha</label>
          <Input type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">Teléfono</label>
          <Input placeholder="+5076..." value={patientPhone} onChange={(e)=>setPatientPhone(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">Nombre del paciente</label>
          <Input placeholder="Juan Pérez" value={patientName} onChange={(e)=>setPatientName(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input id="prepay" type="checkbox" checked={prepay} onChange={()=>setPrepay(!prepay)} />
          <label htmlFor="prepay" className="text-sm">Pagar ahora (Demo)</label>
        </div>
      </div>

      {/* Lista de horarios */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Horarios disponibles</div>
        {times.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {times.map((t)=>(
              <button key={t}
                      onClick={()=>setTime(t)}
                      className={`px-3 py-1 rounded-2xl border ${time===t ? "bg-black text-white" : "bg-white"}`}>
                {t}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-600">
            {msg || "No hay horarios listados. Puedes escribir una hora manual abajo."}
          </div>
        )}

        {/* Hora manual (fallback) */}
        <div className="flex items-center gap-2">
          <label className="text-sm">Hora manual:</label>
          <Input id="manual-time" type="time" defaultValue="" className="w-40" />
          <span className="text-xs text-slate-600">Usaremos esta hora si no seleccionas un botón de la lista.</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={loading}>{loading ? "Reservando..." : "Reservar"}</Button>
        {!!msg && <div className="text-sm text-red-600">{msg}</div>}
      </div>
    </div>
  );
}
