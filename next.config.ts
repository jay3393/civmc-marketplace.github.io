import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "minecraft.wiki" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "minotar.net" },
      { protocol: "https", hostname: "frluejxaygdwwyawhgyc.supabase.co" },
    ],
  },
};

export default nextConfig;
