/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/shared"],
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
};
export default nextConfig;
