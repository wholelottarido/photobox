import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  APP_ENV: z.enum(["development","test","production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().url(),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
  INVITATION_TOKEN_PEPPER: z.string().min(32),
  CLEANUP_CRON_SECRET: z.string().min(16)
});
export function env() {
  const parsed=schema.safeParse(process.env);
  if(!parsed.success) throw new Error(`Server belum dikonfigurasi: ${parsed.error.issues.map(i=>i.path.join(".")).join(", ")}`);
  return parsed.data;
}
