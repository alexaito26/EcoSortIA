import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PWA_THEME_COLOR } from "@/lib/pwa/constants";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { NetworkStatus } from "@/components/pwa/network-status";
import { InstallPrompt } from "@/components/pwa/install-prompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcoSort AI",
  description: "Clasificacion inteligente de residuos con IA e IoT",
  applicationName: "EcoSort AI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // iOS no lee el manifest: estas claves habilitan el modo standalone al
  // instalar desde "Agregar a inicio" en Safari.
  appleWebApp: {
    capable: true,
    title: "EcoSort",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  // Necesario para que las safe areas (notch / barra de gestos) funcionen.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pt-safe-top pb-safe-bottom">
        <NetworkStatus />
        {children}
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
