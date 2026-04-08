/** @type {import('next').NextConfig} */
const nextConfig = {
  // Smaller/faster Cloud Run images: trace server deps into .next/standalone
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  typescript: {
    // Only ignore build errors in development for faster iteration
    // In production, errors should be fixed
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Use environment variable for backend URL, fallback to localhost for development
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
    
    return [
      {
        source: '/api/py/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
