import { createSupabaseServer } from "./supabase/server";
import { requireSession } from "./auth";
import { notFound, redirect } from "next/navigation";
import type { UserRole } from "./auth";

export async function getTenantBySlugForUser(slug: string) {
  const supabase = createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;

  // Trae tenant + rol de la membresía del usuario autenticado
  const { data, error } = await supabase
    .from("tenants")
    .select("id, slug, name, timezone, memberships!inner(role)")
    .eq("slug", slug)
    .eq("memberships.user_id", auth.user.id)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;

  const role = Array.isArray((data as any).memberships) && (data as any).memberships[0]?.role;
  return { id: data.id as string, slug: data.slug as string, name: data.name as string, timezone: data.timezone as string, role: role as UserRole };
}

export async function requireTenant(slug: string) {
  await requireSession();
  const t = await getTenantBySlugForUser(slug);
  if (!t) notFound();
  return t;
}

// Verifica que el rol del usuario esté dentro de allowed
export async function requireTenantRole(slug: string, allowed: UserRole[]) {
  const t = await requireTenant(slug);
  if (!allowed.includes(t.role)) {
    // 403 simple
    redirect(`/t/${slug}?forbidden=1`);
  }
  return t;
}
