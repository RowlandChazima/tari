import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#FAF8F5",
  viewportFit: "cover",
};

const inter = localFont({
  src: [
    {
      path: "./fonts/inter/files/inter-latin-wght-normal.woff2",
      style: "normal",
    },
    {
      path: "./fonts/inter/files/inter-latin-wght-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const plusJakartaSans = localFont({
  src: [
    {
      path: "./fonts/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
      style: "normal",
    },
    {
      path: "./fonts/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Tari Curtains Kenya",
  description: "Ready-made architectural curtains for homes and offices in Kenya.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${inter.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
