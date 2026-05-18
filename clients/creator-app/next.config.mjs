import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence lockfile-detection warning in the monorepo.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // PWA service worker: add @ducanh2912/next-pwa when ready for offline/push support.
  // For now, manifest.json + apple-touch-icon meta tags provide "Add to Home Screen" on iOS.
};

export default nextConfig;
