"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: "" } } });
        if (error) throw error;
        setMsg("Cuenta creada. Inicia sesión.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
        router.refresh();
      }
    } catch (err: any) {
      setMsg(err.message ?? "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container py-10">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-4">{mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}</h1>
        <Card className="p-6 space-y-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Contraseña</label>
              <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Procesando..." : (mode === "signin" ? "Entrar" : "Crear cuenta")}
            </Button>
          </form>

          {msg && <p className="text-sm text-red-600">{msg}</p>}

          <div className="text-sm text-slate-600">
            {mode === "signin" ? (
              <>¿No tienes cuenta?{" "}
                <button className="underline" onClick={() => setMode("signup")}>Crear</button>
              </>
            ) : (
              <>¿Ya tienes cuenta?{" "}
                <button className="underline" onClick={() => setMode("signin")}>Inicia sesión</button>
              </>
            )}
          </div>

          <div className="text-sm">
            <Link className="underline" href="/">Volver al inicio</Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
