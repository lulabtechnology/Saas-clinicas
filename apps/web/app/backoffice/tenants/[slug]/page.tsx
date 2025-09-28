import { requireSession, isPlatformAdmin } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import EditorClient from "./ui/EditorClient";

export const dynamic = "force-dynamic";

export default async function TenantEditor({ params }: { params: { slug: string } }) {
  await requireSession();
  if (!(await isPlatformAdmin())) redirect("/backoffice");

  const supabase = createSupabaseServer();
  const { data: tenant } = await supabase.from("tenants").select("id, slug, name, timezone, branding").eq("slug", params.slug).maybeSingle();
  if (!tenant) notFound();

  // Busca draft más reciente o crea v1 si no existe (lado server con anon; lectura permitida por RLS)
  const { data: draft } = await supabase
    .from("publishes")
    .select("version, status, snapshot")
    .eq("tenant_id", tenant.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const initial = draft?.status === "draft" ? draft : { version: (draft?.version ?? 0) + 1, status: "draft", snapshot: {
    clinic: { name: tenant.name, slug: tenant.slug, timezone: tenant.timezone, branding: tenant.branding ?? { primaryColor: "#0ea5e9" } },
    services: [], professionals: [], availability: []
  }};

  return (
    <main className="container py-8">
      <EditorClient tenant={{ id: tenant.id as string, slug: tenant.slug as string }} draft={initial as any} />
    </main>
  );
}
