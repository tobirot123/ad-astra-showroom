import type { Metadata } from "next";
import { Fraunces, Inter, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ad Astra · Showroom",
  description: "Galería de ventas para desarrollos inmobiliarios. La desarrolladora administra unidades, precios y zonas sin pedirle nada a la agencia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className={`${outfit.variable} ${fraunces.variable} ${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
