const nextConfig = {
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:4101/api/:path*' }];
  },
};

export default nextConfig;
