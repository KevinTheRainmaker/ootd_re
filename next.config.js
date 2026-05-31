/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack (Next.js 16 default) supports WASM natively; empty config silences the mismatch warning
  turbopack: {},
  // Kept for `npm run dev -- --webpack` fallback
  webpack(config, { isServer }) {
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "k.kakaocdn.net",
      },
    ],
  },
};

module.exports = nextConfig;
