import type { NextConfig } from "next";
import path from "node:path";

const workspaceRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bvirrbphqdzrtreqdrmf.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
