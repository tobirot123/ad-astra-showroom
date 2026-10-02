import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#141210] text-[#f6f1e8]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <p className="font-serif text-xl tracking-wide">Ad Astra</p>
        <nav className="flex gap-4 text-sm">
          <Link href="/s/alba" className="underline-offset-4 hover:underline">
            Showroom
          </Link>
          <Link href="/admin/login" className="rounded-full bg-[#f6f1e8] px-4 py-2 text-[#1c1915]">
            Entrar al panel
          </Link>
        </nav>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-[#c4a574]">Galería de ventas</p>
          <h1 className="mt-4 font-serif text-5xl leading-tight md:text-7xl">El showroom lo cambia la desarrolladora.</h1>
          <p className="mt-6 max-w-xl text-lg text-[#e7dccb]">
            Fachada con unidades clickeables, ficha con metros, precio y plano, y un panel para editar todo sin esperar a la agencia.
            Los vendedores piden reservar: el admin aprueba.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/s/alba" className="rounded-full bg-[#c4a574] px-5 py-3 text-[#1c1915]">
              Ver ALBA
            </Link>
            <Link href="/admin/login" className="rounded-full border border-[#8a7b68] px-5 py-3">
              Abrir el panel
            </Link>
          </div>
        </div>
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-[#c4a574]">Proyecto demo</p>
          <p className="mt-2 font-serif text-3xl">ALBA</p>
          <p className="mt-2 text-sm text-[#d9cbb8]">Torre A · 20 unidades · Rosario. Datos de muestra, no es un emprendimiento real.</p>
          <ul className="mt-6 space-y-2 text-sm text-[#e7dccb]">
            <li>Polígonos sobre la fachada, coloreados por estado.</li>
            <li>La reserva pendiente sigue viéndose disponible.</li>
            <li>Tabla tipo planilla, CSV e historial.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
