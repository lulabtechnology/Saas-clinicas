import { isPlatformAdmin, requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BackofficePage() {
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

  return (
    <main className="container py-10">
      <h1 className="text-2xl font-semibold">Backoffice — Plataforma</h1>
      <p className="text-slate-600">Aquí gestionaremos clínicas, borradores y publicaciones (Fase 3).</p>
    </main>
  );
}
