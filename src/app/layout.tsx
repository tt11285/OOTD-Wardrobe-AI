import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { TopNav } from "@/components/top-nav";
import "./globals.css";

// Playfair Display — magazine-grade serif for large headings & brand name
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

// Inter — clean, humanist sans-serif for all body text & UI labels
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OOTD",
  description: "AI Native wardrobe styling assistant",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f9f6f2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
