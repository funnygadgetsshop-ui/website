/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sites uses the same application as a static preview; Vercel runs native Next.js.
  ...(process.env.SITES_STATIC_EXPORT === '1' ? { output: 'export' } : {}),
  poweredByHeader: false,
  devIndicators: false,
};

export default nextConfig;
