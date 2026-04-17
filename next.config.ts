import path from "path";
import { fileURLToPath } from "url";

import type { NextConfig } from "next";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.tcgdex.net",
      },
    ],
  },
  turbopack: {
    root: currentDirectory,
  },
};

export default nextConfig;
