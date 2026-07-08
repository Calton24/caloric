import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    // Landing + legal pages use straight quotes in long-form copy.
    // Typechecking still runs; ignore ESLint plugin edge-cases during CI build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
