import type { NextConfig } from "next";

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const livekit = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const connect = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://*.livekit.cloud",
  "wss://*.livekit.cloud"
];
if (supabase) connect.push(supabase.replace("https://", "wss://"), supabase);
if (livekit) connect.push(livekit);

const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["sharp"],
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        { key: "Content-Security-Policy", value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.supabase.co; media-src 'self' blob:; connect-src ${connect.join(" ")}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` }
      ]
    }];
  }
};
export default config;
