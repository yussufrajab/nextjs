import type {NextConfig} from 'next';

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  // Remove X-Powered-By header for security
  poweredByHeader: false,

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Allow cross-origin requests from production domain
  allowedDevOrigins: ['csms.zanajira.go.tz'],
  // Environment variables for build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002/api',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:9002',
  },

  // Security Headers Configuration
  async headers() {
    // Determine if we're in production
    const isProduction = process.env.NODE_ENV === 'production';

    // Content Security Policy configuration
    // This CSP is balanced between security and functionality
    const ContentSecurityPolicy = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com data:;
      img-src 'self' data: https: blob:;
      media-src 'self' data: blob:;
      connect-src 'self' https://generativelanguage.googleapis.com https://accounts.google.com;
      frame-src 'self' https://accounts.google.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'self';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: isProduction
              ? 'max-age=63072000; includeSubDomains; preload' // 2 years for production
              : 'max-age=0' // Disabled in development
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN' // Prevent clickjacking by only allowing same-origin framing
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff' // Prevent MIME type sniffing
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block' // Enable XSS filter (legacy, but still useful)
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin' // Control referrer information
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' // Restrict browser features
          },
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none' // Prevent Adobe Flash and PDF cross-domain access
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp' // Require explicit permission for cross-origin resources
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin' // Isolate browsing context from cross-origin windows
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin' // Only allow same-origin requests for resources
          }
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
