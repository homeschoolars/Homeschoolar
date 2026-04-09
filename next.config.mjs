/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker/Cloud Run uses `next start` + full node_modules (see Dockerfile). Do not use
  // output: 'standalone' — Next 16 standalone repeatedly failed to open PORT on Cloud Run.
  typescript: {
    // Only ignore build errors in development for faster iteration
    // In production, errors should be fixed
    ignoreBuildErrors: process.env.NODE_ENV === "development",
  },
  images: {
    unoptimized: true,
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
