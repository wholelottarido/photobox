import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const expected = Deno.env.get("CLEANUP_CRON_SECRET");
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) return new Response("Unauthorized", { status: 401 });
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return Response.json({ error: "Server configuration missing" }, { status: 500 });
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString(), stats = { results: 0, raw: 0, failures: 0 };
  const { data: results } = await supabase.from("photobox_results").select("id,storage_path,thumbnail_path").lt("expires_at", now).limit(100);
  for (const result of results ?? []) {
    const paths = [result.storage_path, result.thumbnail_path].filter(Boolean) as string[];
    const { error } = await supabase.storage.from("photobox-results").remove(paths);
    if (error) { stats.failures++; continue; }
    const { error: rowError } = await supabase.from("photobox_results").delete().eq("id", result.id);
    if (rowError) stats.failures++; else stats.results++;
  }
  const cutoff = new Date(Date.now() - 86_400_000).toISOString();
  const { data: shots } = await supabase.from("photo_shots").select("id,storage_path").not("storage_path", "is", null).lt("created_at", cutoff).limit(200);
  for (const shot of shots ?? []) {
    const { error } = await supabase.storage.from("photobox-raw").remove([shot.storage_path]);
    if (error) { stats.failures++; continue; }
    const { error: rowError } = await supabase.from("photo_shots").delete().eq("id", shot.id);
    if (rowError) stats.failures++; else stats.raw++;
  }
  await supabase.rpc("cleanup_expired_records");
  return Response.json({ ok: stats.failures === 0, ...stats });
});
