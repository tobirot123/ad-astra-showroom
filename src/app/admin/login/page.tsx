"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DEMO = [
  ["Martín Ruiz · admin", "martin.admin@demo.adastra"],
  ["Laura Gómez · vendedora", "laura.ventas@demo.adastra"],
  ["Pedro Soler · solo lectura", "pedro.lectura@demo.adastra"],
  ["Sofía · superadmin", "superadmin@demo.adastra"],
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("martin.admin@demo.adastra");
  const [password, setPassword] = useState("AdAstra2026!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const demo = !process.env.NEXT_PUBLIC_SUPABASE_URL;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(json.error ?? "No pudimos ingresar.");
      return;
    }
    router.replace("/admin");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#1c1915] px-4 text-[#f6f1e8]">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-[#c4a574]">← Inicio</Link>
        <h1 className="mt-4 font-serif text-4xl">Entrar al panel</h1>
        <p className="mt-2 text-sm text-[#d9cbb8]">Email y contraseña. En el modo demo los usuarios de abajo ya están cargados.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input className="w-full rounded-xl bg-white/10 px-3 py-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <input className="w-full rounded-xl bg-white/10 px-3 py-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Contraseña" />
          {error && <p className="text-sm text-[#f3b4ae]">{error}</p>}
          <button disabled={loading} className="w-full rounded-full bg-[#f6f1e8] py-3 text-[#1c1915]">
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
        {demo && (
          <ul className="mt-6 space-y-2 text-sm text-[#d9cbb8]">
            {DEMO.map(([label, mail]) => (
              <li key={mail}>
                <button type="button" className="text-left underline" onClick={() => setEmail(mail)}>
                  {label}
                </button>
                <span className="block text-xs">{mail} · AdAstra2026!</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
