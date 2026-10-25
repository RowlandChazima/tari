import type { NextConfig } from "next";

function getSupabaseRemotePattern() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return [
      {
        protocol: 'https' as const,
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/product-media/**',
      },
    ];
  }

  try {
    const parsed = new URL(supabaseUrl);
    return [
      {
        protocol: (parsed.protocol.replace(':', '') || 'https') as 'http' | 'https',
        hostname: parsed.hostname,
        pathname: '/storage/v1/object/public/product-media/**',
      },
    ];
  } catch {
    return [
      {
        protocol: 'https' as const,
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/product-media/**',
      },
    ];
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  images: {
    remotePatterns: getSupabaseRemotePattern(),
  },
};

export default nextConfig;
