import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "pharmacycouncil.org",
      },
      {
        protocol: "https",
        hostname: "telehealththailand.vercel.app",
      },
      {
        protocol: "https",
        hostname: "bvirrbphqdzrtreqdrmf.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Public Routes
        { source: "/home", destination: "/01_home" },
        { source: "/home/:path*", destination: "/01_home/:path*" },
        { source: "/about", destination: "/02_about" },
        { source: "/about/:path*", destination: "/02_about/:path*" },
        { source: "/department", destination: "/03_department" },
        { source: "/department/:path*", destination: "/03_department/:path*" },
        { source: "/service", destination: "/04_service" },
        { source: "/service/:path*", destination: "/04_service/:path*" },
        { source: "/meeting", destination: "/05_meeting" },
        { source: "/meeting/:path*", destination: "/05_meeting/:path*" },
        { source: "/news", destination: "/06_news" },
        { source: "/news/:path*", destination: "/06_news/:path*" },
        { source: "/laws", destination: "/07_laws" },
        { source: "/laws/:path*", destination: "/07_laws/:path*" },
        { source: "/other-service", destination: "/08_other-service" },
        { source: "/other-service/:path*", destination: "/08_other-service/:path*" },
        { source: "/contact", destination: "/09_contact" },
        { source: "/contact/:path*", destination: "/09_contact/:path*" },
        { source: "/license-search", destination: "/10_license-search" },
        { source: "/license-search/:path*", destination: "/10_license-search/:path*" },

        // Member Routes
        { source: "/member-home", destination: "/01_member-home" },
        { source: "/member-home/:path*", destination: "/01_member-home/:path*" },
        { source: "/profile", destination: "/02_profile" },
        { source: "/profile/:path*", destination: "/02_profile/:path*" },
        { source: "/member-service", destination: "/03_member-service" },
        { source: "/member-service/:path*", destination: "/03_member-service/:path*" },
        { source: "/member-meeting", destination: "/04_member-meeting" },
        { source: "/member-meeting/:path*", destination: "/04_member-meeting/:path*" },
        { source: "/learning", destination: "/05_learning" },
        { source: "/learning/:path*", destination: "/05_learning/:path*" },
        { source: "/careers", destination: "/06_careers" },
        { source: "/careers/:path*", destination: "/06_careers/:path*" },
        { source: "/tools", destination: "/07_tools" },
        { source: "/tools/:path*", destination: "/07_tools/:path*" },
        { source: "/store", destination: "/08_store" },
        { source: "/store/:path*", destination: "/08_store/:path*" },

        // API Proxy
        {
          source: "/api/proxy/:path*",
          destination: "https://pharmacy-api-6w5d.onrender.com/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
