"use client";

import { AdminProvider } from "@/components/admin/provider";
import { Shell } from "@/components/admin/shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <Shell>{children}</Shell>
    </AdminProvider>
  );
}
