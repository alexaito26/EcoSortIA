import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El paquete compartido se consume como fuente TypeScript.
  transpilePackages: ["@ecosort/shared"],

  async headers() {
    return [
      {
        // El sw.js nunca debe quedar cacheado por el navegador: si se congela,
        // el usuario se queda atrapado en una version vieja de la app.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
