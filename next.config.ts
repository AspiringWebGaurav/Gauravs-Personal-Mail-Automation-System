import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
        ];
    },
};

// Only wrap with next-pwa in production builds to avoid
// Webpack/Turbopack conflict when running `next dev --turbopack`
const isProd = process.env.NODE_ENV === 'production';

let exportedConfig: NextConfig = nextConfig;

if (isProd) {
    const withPWA = require('next-pwa')({
        dest: 'public',
        register: true,
        skipWaiting: true,
    });
    exportedConfig = withPWA(nextConfig);
}

export default exportedConfig;

