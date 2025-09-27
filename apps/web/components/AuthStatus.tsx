"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "./ui/button";
import Link from "next/link";

export default function AuthStatus() {
  const supabase = createSupabaseBrowser();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (email) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-700">Conectado: {email}</span>
        <Button variant="outline" onClick={signOut}>Salir</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/signin"><Button variant="outline">Iniciar sesión</Button></Link>
    </div>
  );
}
