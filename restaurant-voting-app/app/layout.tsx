import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGate from "@/app/components/AuthGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://munchmatch.app"),
  title: "MunchMatch — Group Restaurant Voting",
  description:
    "Swipe together, eat together. MunchMatch helps your group pick the perfect restaurant with real-time voting.",
  openGraph: {
    title: "MunchMatch — Group Restaurant Voting",
    description:
      "Swipe together, eat together. MunchMatch helps your group pick the perfect restaurant with real-time voting.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <noscript>
          <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
            <h1>JavaScript Required</h1>
            <p>
              MunchMatch requires JavaScript to run. Please enable JavaScript in
              your browser settings to use this app.
            </p>
          </div>
        </noscript>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
