// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Kanit } from 'next/font/google';

const kanit = Kanit({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-kanit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "PharmacyOne",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={kanit.variable}>
      <body className={kanit.className}>{children}</body>
    </html>
  );
}