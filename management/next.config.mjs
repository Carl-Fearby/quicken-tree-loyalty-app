const nextConfig = {
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `http://127.0.0.1:${process.env.MANAGEMENT_API_PORT || 4101}/api/:path*` }];
  },
};

export default nextConfig;
