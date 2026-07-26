import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { RoomServiceClient } from "livekit-server-sdk";

function loadEnvFile(path = ".env.local") {
  const values = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]*)=(.*)$/);
    if (!match) continue;
    values[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

function findAnonymousSetting(value) {
  if (!value || typeof value !== "object") return undefined;
  for (const [key, child] of Object.entries(value)) {
    if (/anonymous/i.test(key) && typeof child === "boolean") return child;
    const nested = findAnonymousSetting(child);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

async function validate() {
  const env = loadEnvFile();
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET"
  ];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const themes = await supabase.from("photobox_themes").select("slug,is_active");
  console.log(`SUPABASE_DATA_API=${themes.error ? "FAIL" : "OK"}`);
  console.log(`ACTIVE_THEME_COUNT=${themes.error ? 0 : themes.data.filter((theme) => theme.is_active).length}`);
  if (themes.error) console.log(`SUPABASE_ERROR_CODE=${themes.error.code ?? "UNKNOWN"}`);

  const buckets = await supabase.storage.listBuckets();
  console.log(`SUPABASE_STORAGE=${buckets.error ? "FAIL" : "OK"}`);
  if (!buckets.error) {
    const names = buckets.data.map((bucket) => bucket.name);
    console.log(`RAW_BUCKET=${names.includes("photobox-raw")}`);
    console.log(`RESULT_BUCKET=${names.includes("photobox-results")}`);
  }

  const settingsResponse = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/auth/v1/settings`,
    { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } }
  );
  console.log(`SUPABASE_AUTH_ENDPOINT=${settingsResponse.ok ? "OK" : "FAIL"}`);
  if (settingsResponse.ok) {
    const settings = await settingsResponse.json();
    const anonymous = findAnonymousSetting(settings);
    console.log(`ANONYMOUS_SIGN_INS=${anonymous === undefined ? "CHECK_DASHBOARD" : anonymous}`);
  }

  const livekitHost = env.NEXT_PUBLIC_LIVEKIT_URL
    .replace(/^wss:/, "https:")
    .replace(/^ws:/, "http:");
  const livekit = new RoomServiceClient(livekitHost, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  const rooms = await livekit.listRooms();
  console.log("LIVEKIT_API=OK");
  console.log(`LIVEKIT_ROOM_COUNT=${rooms.length}`);

  const failed = themes.error
    || buckets.error
    || !settingsResponse.ok
    || !buckets.data?.some((bucket) => bucket.name === "photobox-raw")
    || !buckets.data?.some((bucket) => bucket.name === "photobox-results");
  if (failed) process.exitCode = 1;
}

validate().catch((error) => {
  console.error("CLOUD_VALIDATION=FAIL");
  console.error(`ERROR_TYPE=${error?.constructor?.name ?? "Unknown"}`);
  console.error(`ERROR_STATUS=${error?.status ?? error?.code ?? "UNKNOWN"}`);
  process.exitCode = 1;
});
