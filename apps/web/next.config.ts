import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El paquete compartido se consume como fuente TypeScript.
  transpilePackages: ["@ecosort/shared"],
};

export default nextConfig;
