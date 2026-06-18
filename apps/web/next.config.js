/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: (config) => {
    // Treat .onnx files as static assets — do not bundle them
    config.module.rules.push({
      test: /\.onnx$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
