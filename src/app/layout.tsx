import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "Doigt de Fée · Business management for security installers", template: "%s · Doigt de Fée" },
  description:
    "Stock, clients, jobs, quotes and invoices: management software built for CCTV, alarm and smart home installers.",
};

export const viewport: Viewport = { themeColor: "#17201d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${instrument.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
