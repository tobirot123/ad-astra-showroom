"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminData } from "@/lib/services/present";

interface AdminContextValue {
  data: AdminData | null;
  error: string;
  notice: string;
  mutate: (body: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  refresh: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("Falta el panel");
  return ctx;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    const response = await fetch("/api/admin/bootstrap");
    if (response.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "No pudimos cargar el panel.");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function mutate(body: Record<string, unknown>) {
    setError("");
    const response = await fetch("/api/admin/mutate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      if (json.needsConfirm || json.conflict) {
        const accepted = window.confirm(json.error);
        if (!accepted) return null;
        return mutate({ ...body, confirm: true, force: true });
      }
      setError(json.error ?? "No pudimos guardar.");
      return null;
    }
    setData(json.bootstrap);
    setNotice("Guardado");
    window.setTimeout(() => setNotice(""), 1800);
    return json;
  }

  return <AdminContext.Provider value={{ data, error, notice, mutate, refresh }}>{children}</AdminContext.Provider>;
}
