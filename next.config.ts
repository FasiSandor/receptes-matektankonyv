import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: {remotePatterns:[{protocol:"https",hostname:"images.unsplash.com"}]},
  async rewrites() {
    return [{source:"/api/mota-import/gateway",destination:"https://recept-ai-phi.vercel.app/api"}];
  },
};
export default nextConfig;
