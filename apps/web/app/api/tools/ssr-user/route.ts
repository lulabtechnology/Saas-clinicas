import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.json({ user });
}
