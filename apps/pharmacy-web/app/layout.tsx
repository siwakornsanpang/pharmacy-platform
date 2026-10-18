import type { Metadata } from "next";
import { Geist, Geist_Mono, Kanit } from "next/font/google";
import "./globals.css";
import AppHeader from "@/components/ui/AppHeader";
import Footer from "@/components/ui/Footer";
import Providers from "@/components/ui/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const kanit = Kanit({
  variable: "--font-kanit",
  weight: ["300", "400", "500", "600"],
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "Pharmacy Council of Thailand",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${kanit.variable} antialiased bg-gray-50 text-gray-900 flex flex-col min-h-screen`}>
        <Providers>
          <AppHeader />
          <main className="flex-grow flex flex-col bg-white pb-[var(--page-bottom-space)]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
