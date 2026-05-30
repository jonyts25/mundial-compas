import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "apiv3.apifootball.com",
        pathname: "/badges/**",
      },
    ],
  },
};

export default nextConfig;
