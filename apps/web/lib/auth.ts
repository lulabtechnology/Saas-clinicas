import { redirect } from "next/navigation";
import { createSupabaseServer } from "./supabase/server";

export type UserRole = "owner" | "admin" | "pro" | "viewer";

export async function getSessionUser() {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function requireSession() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  return user;
}

export async function isPlatformAdmin() {
  const supabase = createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return false;
  const { data } = await supabase
    .from("users")
    .select("is_platform_admin")
    .eq("id", auth.user.id)
    .maybeSingle();
  return data?.is_platform_admin === true;
}
