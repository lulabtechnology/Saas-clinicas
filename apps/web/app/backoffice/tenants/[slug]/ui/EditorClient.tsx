"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { saveDraftAction, previewLinkAction, publishAction } from "../server-actions";

type Draft = {
  version: number;
  status: "draft"|"published"|"archived";
  snapshot: any;
};

export default function EditorClient({ tenant, draft }: { tenant: { id: string; slug: string }, draft: Draft }) {
  const [tab, setTab] = useState<"info"|"services"|"professionals"|"branding"|"versions">("services");
  const [data, setData] = useState<any>(draft.snapshot);
  const [version, setVersion] = useState<number>(draft.version);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const addService = () => {
    setData((d: any) => ({ ...d, services: [...(d.services ?? []), { id: crypto.randomUUID(), name: "", duration_minutes: 30, price_cents: 0, is_active: true }] }));
  };
  const rmService = (id: string) => setData((d: any) => ({ ...d, services: (d.services ?? []).filter((s: any) => s.id !== id) }));

  const addPro = () => {
    setData((d: any) => ({ ...d, professionals: [...(d.professionals ?? []), { id: crypto.randomUUID(), full_name: "", specialty: "", calendar_color: "#22c55e", is_active: true }] }));
  };
  const rmPro = (id: string) => setData((d: any) => ({ ...d, professionals: (d.professionals ?? []).filter((p: any) => p.id !== id) }));

  const save = () => startTransition(async () => {
    setMsg(null);
    const res = await saveDraftAction({ tenantId: tenant.id, version, snapshot: data });
    if (res.ok) setMsg("Borrador guardado.");
    else setMsg(res.error || "Error al guardar");
  });

  const genPreview = () => startTransition(async () => {
    const res = await previewLinkAction({ slug: tenant.slug, version });
    if (res.ok) setPreviewUrl(res.url!);
    else setMsg(res.error || "No se pudo generar previsualización");
  });

  const publish = () => startTransition(async () => {
    setMsg(null);
    const res = await publishAction({ tenantId: tenant.id, slug: tenant.slug, version });
    if (res.ok) setMsg("Publicado correctamente.");
    else setMsg(res.error || "Error al publicar");
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Editar clínica: {tenant.slug}</h1>
          <p className="text-sm text-slate-600">Versión borrador: v{version}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={pending}>Guardar borrador</Button>
          <Button variant="outline" onClick={genPreview} disabled={pending}>Previsualizar</Button>
          <Button variant="outline" onClick={publish} disabled={pending}>Publicar</Button>
          <Link href="/backoffice"><Button variant="ghost">Volver</Button></Link>
        </div>
      </div>

      {msg && <div className="text-sm text-green-700">{msg}</div>}
      {previewUrl && (
        <div className="text-sm">
          Link de previsualización:{" "}
          <a className="underline" href={previewUrl} target="_blank" rel="noreferrer">{previewUrl}</a>
        </div>
      )}

      {/* Tabs simples */}
      <div className="flex gap-2">
        {(["info","services","professionals","branding","versions"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-2xl border ${tab===t?"bg-slate-900 text-white":"bg-white"}`}>{t}</button>
        ))}
      </div>

      {/* Contenido */}
      {tab==="info" && (
        <Card className="p-6 space-y-3">
          <label className="text-sm">Nombre
            <Input value={data?.clinic?.name ?? ""} onChange={e => setData((d:any)=>({ ...d, clinic: { ...(d.clinic ?? {}), name: e.target.value }}))} />
          </label>
          <label className="text-sm">Slug (solo lectura)
            <Input value={data?.clinic?.slug ?? ""} readOnly />
          </label>
          <label className="text-sm">Time Zone
            <Input value={data?.clinic?.timezone ?? "America/Panama"} onChange={e => setData((d:any)=>({ ...d, clinic: { ...(d.clinic ?? {}), timezone: e.target.value }}))} />
          </label>
        </Card>
      )}

      {tab==="services" && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Servicios</h2>
            <Button variant="outline" onClick={addService}>+ Agregar</Button>
          </div>
          <div className="grid gap-3">
            {(data.services ?? []).map((s:any) => (
              <div key={s.id} className="border rounded-2xl p-4 grid md:grid-cols-5 gap-3">
                <Input placeholder="Nombre" value={s.name} onChange={e => setData((d:any)=>({...d, services: d.services.map((x:any)=> x.id===s.id?{...x, name:e.target.value}:x)}))} />
                <Input type="number" placeholder="Duración (min)" value={s.duration_minutes} onChange={e => setData((d:any)=>({...d, services: d.services.map((x:any)=> x.id===s.id?{...x, duration_minutes:Number(e.target.value)}:x)}))} />
                <Input type="number" placeholder="Precio (centavos)" value={s.price_cents} onChange={e => setData((d:any)=>({...d, services: d.services.map((x:any)=> x.id===s.id?{...x, price_cents:Number(e.target.value)}:x)}))} />
                <Input placeholder="Activo (true/false)" value={String(s.is_active ?? true)} onChange={e => setData((d:any)=>({...d, services: d.services.map((x:any)=> x.id===s.id?{...x, is_active:e.target.value==="true"}:x)}))} />
                <Button variant="ghost" onClick={()=>rmService(s.id)}>Eliminar</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab==="professionals" && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Profesionales</h2>
            <Button variant="outline" onClick={addPro}>+ Agregar</Button>
          </div>
          <div className="grid gap-3">
            {(data.professionals ?? []).map((p:any) => (
              <div key={p.id} className="border rounded-2xl p-4 grid md:grid-cols-5 gap-3">
                <Input placeholder="Nombre completo" value={p.full_name} onChange={e => setData((d:any)=>({...d, professionals: d.professionals.map((x:any)=> x.id===p.id?{...x, full_name:e.target.value}:x)}))} />
                <Input placeholder="Especialidad" value={p.specialty} onChange={e => setData((d:any)=>({...d, professionals: d.professionals.map((x:any)=> x.id===p.id?{...x, specialty:e.target.value}:x)}))} />
                <Input placeholder="Color calendario (#HEX)" value={p.calendar_color} onChange={e => setData((d:any)=>({...d, professionals: d.professionals.map((x:any)=> x.id===p.id?{...x, calendar_color:e.target.value}:x)}))} />
                <Input placeholder="Activo (true/false)" value={String(p.is_active ?? true)} onChange={e => setData((d:any)=>({...d, professionals: d.professionals.map((x:any)=> x.id===p.id?{...x, is_active:e.target.value==="true"}:x)}))} />
                <Button variant="ghost" onClick={()=>rmPro(p.id)}>Eliminar</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab==="branding" && (
        <Card className="p-6 space-y-3">
          <label className="text-sm">Color primario (#HEX)
            <Input value={data?.clinic?.branding?.primaryColor ?? "#0ea5e9"}
                   onChange={e => setData((d:any)=>({ ...d, clinic: { ...(d.clinic ?? {}), branding: { ...(d.clinic?.branding ?? {}), primaryColor: e.target.value }}}))} />
          </label>
        </Card>
      )}

      {tab==="versions" && (
        <Card className="p-6">
          <p className="text-sm text-slate-600">El historial detallado de versiones se listará aquí (fase posterior).</p>
        </Card>
      )}
    </div>
  );
}
