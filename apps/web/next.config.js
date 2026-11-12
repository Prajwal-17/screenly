import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/shared"],
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  // The repository keeps its own agent instructions at the root.
  agentRules: false,
};
export default nextConfig;

// Exposes Cloudflare bindings to `next dev`; deployed builds run in the OpenNext worker.
if (process.env.NODE_ENV === "development") initOpenNextCloudflareForDev();
