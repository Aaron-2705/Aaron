import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Strict-but-compatible CSP.
 *
 * Everything relaxed below is relaxed for a named reason, and each reason is
 * mirrored in the "HOW I SECURED THIS SITE" section (data/hardening.ts) so the
 * page and the config cannot drift apart quietly.
 *
 * - 'unsafe-inline' script/style is required by the Next.js inline bootstrap and
 *   by Tailwind/framer inline styles (no nonce infrastructure here). This is the
 *   one control the site does NOT get full marks on, and it says so on the page.
 * - 'wasm-unsafe-eval' is required by the self-hosted Draco decoder, which
 *   compiles draco_decoder.wasm inside a blob: worker to decompress the
 *   workstation GLB. It permits WebAssembly compilation ONLY: unlike
 *   'unsafe-eval' it does not re-enable eval()/new Function() for JS.
 * - 'unsafe-eval' only in dev (Turbopack HMR). Never in production.
 * - blob: workers/images cover three.js loaders (Draco/KTX decode in workers).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // blob: - three.js GLTFLoader fetches embedded textures via blob: URLs.
  // api.github.com - FieldReports live activity feed, opt-in via NEXT_PUBLIC_GITHUB_USER.
  "connect-src 'self' blob: https://api.github.com",
  "worker-src 'self' blob:",
  "media-src 'self'",
  "manifest-src 'self'",
  // No <object>/<embed> anywhere, and nothing on this origin is framed.
  "object-src 'none'",
  "frame-src 'none'",
  "child-src 'self' blob:",
  "base-uri 'self'",
  // The contact form posts to this origin's own route handler and nowhere else.
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Permissions-Policy: deny by default. This site needs no device APIs at all,
 * so every powerful feature is switched off rather than left at the UA default.
 */
const permissionsPolicy = [
  "accelerometer=()",
  "ambient-light-sensor=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "publickey-credentials-get=()",
  "screen-wake-lock=()",
  "serial=()",
  "usb=()",
  "xr-spatial-tracking=()",
].join(", ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Legacy belt to the CSP frame-ancestors braces. Both, deliberately.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: permissionsPolicy },
  // 2 years, subdomains included, preload-eligible. Browsers ignore this over
  // plain http (localhost), so it is safe to send unconditionally.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Severs the window.opener relationship with any cross-origin page that opens
  // this one, and blocks cross-origin embedding of this origin's subresources.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework to scanners.
  poweredByHeader: false,
  /**
   * This site does not use next/image anywhere and serves no remote images, yet
   * /_next/image was still live and still piping requests through sharp, and so
   * through libvips (GHSA-f88m-g3jw-g9cj, unfixed in the version Next 16.2.12
   * bundles). Verified by request: the endpoint returned image/png for a local
   * file before this line and 400 after it.
   *
   * Nothing regresses, because the optimizer had no callers. If next/image is
   * ever introduced, delete this and re-check the sharp advisory first.
   */
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // The contact endpoint must never be cached by a CDN or the browser.
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
