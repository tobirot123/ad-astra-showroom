import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Cormorant_Garamond, Outfit } from "next/font/google"
import "./globals.css"

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
})

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-serif",
})

export const metadata: Metadata = {
  title: "Haras Andrea Virginia · Showroom",
  description: "Lotes en Plomer, General Las Heras. Barrio Haras Andrea Virginia.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  )
}
