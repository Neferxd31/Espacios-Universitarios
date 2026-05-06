/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Needed for standalone Docker image
  output: 'standalone',
};

export default nextConfig;
