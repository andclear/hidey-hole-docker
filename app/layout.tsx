import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AIAnalysisProvider } from "@/components/ai/ai-analysis-provider";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "囤囤小兄许 (Hidey-Hole)",
  description: "个人角色卡收藏管理系统",
  applicationName: "囤囤小兄许",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // Use black-translucent for immersive feel, or 'default' if it breaks
    title: "囤囤小兄许",
    // startupImage: [], // Can be added later for splash screens
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
        { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
        { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
        { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
        { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
        { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
        { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png" }, // Default fallback (no size specified for general use)
      { url: "/icons/icon-152x152.png", sizes: "152x152" },
      { url: "/icons/icon-167x167.png", sizes: "167x167" },
      { url: "/icons/icon-180x180.png", sizes: "180x180" },
      { url: "/icons/icon-1024x1024.png", sizes: "1024x1024" },
    ],
  },
};

export const viewport: Viewport = {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#1e1e2e" }, // Deep indigo/black matching globals.css
    ],
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AIAnalysisProvider>
            <Providers>
              {children}
            </Providers>
            <Toaster />
          </AIAnalysisProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
