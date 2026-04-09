/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker/Cloud Run — run `node server.js` (see Dockerfile + docker-entrypoint).
  // Cloud Run sets HOSTNAME to a revision id; standalone uses it for listen() unless entrypoint sets 0.0.0.0.
  output: "standalone",
  outputFileTracingIncludes: {
    // Prisma query engine + generated client are not always picked up by file tracing.
    "/**": ["./node_modules/.prisma/**/*", "./node_modules/@prisma/client/**/*"],
  },
  typescript: {
    // Only ignore build errors in development for faster iteration
    // In production, errors should be fixed
    ignoreBuildErrors: process.env.NODE_ENV === "development",
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Large app: preloading every route on boot can slow or destabilize cold starts on Cloud Run.
    preloadEntriesOnStart: false,
  },
  async rewrites() {
    // Use environment variable for backend URL, fallback to localhost for development
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"

    return [
      {
        source: "/api/py/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
