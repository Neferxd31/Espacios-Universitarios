/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Needed for standalone Docker image
  output: 'standalone',
  // Comprimir respuestas
  compress: true,
  // Reduce ruido y revalida agresivamente solo en dev
  reactStrictMode: true,
  // Imágenes externas permitidas (Unsplash, etc) para HU-6
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
