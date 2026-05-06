import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Espacios Universitarios — UFPS",
  description: "Sistema de reserva de espacios universitarios de la Universidad Francisco de Paula Santander",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
