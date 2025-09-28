import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true, user: null, is_platform_admin: false });

  const { data } = await supabase
    .from("users")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email },
    is_platform_admin: data?.is_platform_admin === true
  });
}
