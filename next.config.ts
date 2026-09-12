import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'export',
    reactStrictMode: true,
    // The development server is also opened from a phone on the local network.
    // Next otherwise rejects its own development scripts and HMR connection
    // from the LAN hostname, leaving the server-rendered preview non-interactive.
    allowedDevOrigins: ['192.168.68.130'],
    turbopack: {root: __dirname}
};

export default nextConfig;
