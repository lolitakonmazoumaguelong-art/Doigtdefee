import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "Doigt de Fée · Gestion pour installateurs de sécurité", template: "%s · Doigt de Fée" },
  description:
    "Stock, clients, interventions, devis et factures : le logiciel de gestion pensé pour les installateurs de vidéosurveillance, d'alarmes et de maison intelligente.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${instrument.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
