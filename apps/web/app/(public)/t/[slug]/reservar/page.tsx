import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ReservarPage({ params }: { params: { slug: string } }) {
  const admin = createSupabaseAdmin();
  const { data: tenant } = await admin.from("tenants").select("id, name, timezone").eq("slug", params.slug).maybeSingle();
  if (!tenant) return <main className="container py-10">Clínica no encontrada.</main>;

  const { data: services } = await admin.from("services")
    .select("id, name, duration_minutes, price_cents, is_active")
    .eq("tenant_id", tenant.id).eq("is_active", true).order("name");
  const { data: pros } = await admin.from("professionals")
    .select("id, full_name, specialty, is_active")
    .eq("tenant_id", tenant.id).eq("is_active", true).order("full_name");

  return (
    <main className="container py-8 space-y-6">
      <h1 className="text-2xl font-semibold">{tenant.name} — Reservar</h1>
      <Card className="p-6">
        <BookingFlow slug={params.slug} services={services ?? []} pros={pros ?? []} />
      </Card>
    </main>
  );
}

function money(cents:number){ return `PAB ${(cents/100).toFixed(2)}`; }

"use client";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

function BookingFlow({ slug, services, pros }:{
  slug:string,
  services:any[],
  pros:any[]
}) {
  const [serviceId, setServiceId] = useState<string>("");
  const [proId, setProId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [prepay, setPrepay] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedService = useMemo(()=> services.find((s:any)=>s.id===serviceId), [serviceId, services]);
  const selectedPro = useMemo(()=> pros.find((p:any)=>p.id===proId), [proId, pros]);

  useEffect(()=>{ setTime(""); setSlots([]); }, [serviceId, proId, date]);

  const fetchSlots = async () => {
    setMsg(null);
    setSlots([]);
    if (!serviceId || !proId || !date) { setMsg("Selecciona servicio, profesional y fecha."); return; }
    const url = `/api/public/slots?slug=${encodeURIComponent(slug)}&serviceId=${serviceId}&professionalId=${proId}&date=${date}`;
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    if (!j.ok) { setMsg("No se pudieron cargar horarios."); return; }
    setSlots(j.slots || []);
    if ((j.slots || []).length === 0) setMsg("No hay horarios disponibles para esa fecha.");
  };

  const submit = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, serviceId, professionalId: proId, date, time, patientName: name, patientPhone: phone, prepay })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error");
      window.location.href = `/t/${slug}/confirmacion/${j.bookingId}`;
    } catch (e:any) {
      setMsg(e.message || "No se pudo crear la reserva.");
    } finally { setLoading(false); }
  };

  return (
    <div className="grid gap-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Servicio</label>
          <select className="border rounded-2xl px-3 py-2 w-full" value={serviceId} onChange={e=>setServiceId(e.target.value)}>
            <option value="">— elegí —</option>
            {services.map((s:any)=> <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min · {money(s.price_cents)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Profesional</label>
          <select className="border rounded-2xl px-3 py-2 w-full" value={proId} onChange={e=>setProId(e.target.value)}>
            <option value="">— elegí —</option>
            {pros.map((p:any)=> <option key={p.id} value={p.id}>{p.full_name} {p.specialty?`· ${p.specialty}`:""}</option>)}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm">Fecha</label>
          <Input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={fetchSlots}>Ver horarios</Button>
        </div>
        <div>
          <label className="text-sm">Hora</label>
          <select className="border rounded-2xl px-3 py-2 w-full" value={time} onChange={e=>setTime(e.target.value)}>
            <option value="">— elegí —</option>
            {slots.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Nombre</label>
          <Input value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">WhatsApp</label>
          <Input value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input id="prepay" type="checkbox" checked={prepay} onChange={e=>setPrepay(e.target.checked)} />
        <label htmlFor="prepay" className="text-sm">Pagar ahora (Demo)</label>
      </div>

      {msg && <div className="text-sm text-red-600">{msg}</div>}

      <div>
        <Button disabled={!serviceId || !proId || !date || !time || !name || !phone || loading} onClick={submit}>
          {prepay ? "Pagar (Demo) y Reservar" : "Reservar"}
        </Button>
      </div>
    </div>
  );
}
