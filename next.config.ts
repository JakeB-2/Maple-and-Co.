import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client-side router cache: keep recently-visited dynamic routes warm so
    // that tab revisits within this window are served from memory (no server
    // roundtrip, no Suspense flash). Server actions still call revalidatePath
    // after writes, so freshness after mutations is preserved.
    staleTimes: {
      dynamic: 120,
      static: 180,
    },
    // Tree-shake the radix-ui umbrella package the same way Next's defaults
    // already handle lucide-react / date-fns. Every shadcn primitive imports
    // through 'radix-ui', so this hint is the biggest shared-chunk savings.
    // @base-ui/react powers the combobox + select/text field primitives with
    // the same tree-shaking benefit shape as radix-ui.
    // react-day-picker powers DateField/Calendar and is not in Next's default optimized package list.
    optimizePackageImports: ['radix-ui', '@base-ui/react', 'react-day-picker'],
  },
  images: {
    // Allow next/image to serve files from the Maple & Co Supabase Storage
    // bucket (public object URLs only).
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nvuudbhwnbrkitiotjgn.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  async headers() {
    // Baseline security headers. Applied to every route.
    //
    // What's NOT here, on purpose:
    //   - Content-Security-Policy (CSP). Next.js 16 emits inline-script and
    //     inline-style under various rendering modes; a strict CSP needs a
    //     nonce-based setup that the app doesn't have today. Adding a
    //     too-permissive CSP would be worse than none — it would freeze
    //     the policy in a state that can't tighten without a rewrite.
    //     Tracked as a follow-up.
    //   - Strict-Transport-Security (HSTS). Vercel automatically sends
    //     `Strict-Transport-Security: max-age=63072000; includeSubDomains;
    //     preload` for production deployments on `.vercel.app` and custom
    //     domains, so adding it here would be redundant + potentially
    //     conflict with the Vercel-managed header.
    //
    // What IS here: the cheap, low-risk wins that don't depend on app
    // architecture.
    const baselineHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]
    return [
      { source: '/:path*', headers: baselineHeaders },
    ]
  },
};

export default nextConfig;
