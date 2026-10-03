import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShowroomApp } from "@/components/showroom/showroom-app";
import { withDb } from "@/lib/repo";
import { buildPublic } from "@/lib/services/present";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const payload = await withDb((db) => buildPublic(db, slug));
  if (!payload) return { title: "Showroom" };
  const project = payload.kind === "coming_soon" ? payload.project : payload.data.project;
  return {
    title: `${project.nombre} · Showroom`,
    description: project.descripcion,
    openGraph: { title: project.nombre, description: project.descripcion },
  };
}

export default async function ShowroomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = await withDb((db) => buildPublic(db, slug));
  if (!payload) notFound();
  if (payload.kind === "coming_soon") {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#12110f] text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={payload.project.imagen} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#12110f]/45" />
        <div className="relative z-10 px-6 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-[#c4a574]">Próximamente</p>
          <h1 className="mt-3 font-serif text-6xl">{payload.project.nombre}</h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-white/90">{payload.project.descripcion}</p>
          <p className="mt-8 text-sm tracking-[0.18em] uppercase">Volvé pronto</p>
        </div>
      </main>
    );
  }
  return <ShowroomApp data={payload.data} />;
}
