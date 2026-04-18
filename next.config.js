/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "157.90.224.29" },
      { protocol: "https", hostname: "**.plasmic.app" },
      { protocol: "https", hostname: "img.plasmic.app" },
      { protocol: "https", hostname: "plasmic-imgopt.s3.amazonaws.com" },
    ],
  },
};
module.exports = nextConfig;
