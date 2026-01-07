const isDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isDesktop ? 'export' : undefined,
  images: {
    unoptimized: isDesktop,
  },
};

module.exports = nextConfig;
