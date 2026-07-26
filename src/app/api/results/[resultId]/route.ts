import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateResult } from "@/lib/images/generate-result";
import { fail, ok, safeError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

async function allowed(id: string, user: string) {
  const admin = createAdminClient();
  const { data: result } = await admin
    .from("photobox_results")
    .select("*,photo_sessions!inner(room_id)")
    .eq("id", id)
    .maybeSingle();
  if (!result) return null;
  const session = Array.isArray(result.photo_sessions)
    ? result.photo_sessions[0]
    : result.photo_sessions;
  const { data: member } = await admin
    .from("room_participants")
    .select("id")
    .eq("room_id", session?.room_id)
    .eq("user_id", user)
    .maybeSingle();
  return member ? result : null;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const auth = await requireUser();
    if (!auth) return fail("UNAUTHORIZED", "Sesi tidak ditemukan.", 401);
    const { resultId } = await params;
    const result = await allowed(resultId, auth.user.id);
    if (!result)
      return fail("RESULT_NOT_FOUND", "Hasil tidak ditemukan.", 404);
    if (new Date(result.expires_at) < new Date())
      return fail("RESULT_EXPIRED", "Hasil sudah kedaluwarsa.", 410);

    const admin = createAdminClient();
    const session = Array.isArray(result.photo_sessions)
      ? result.photo_sessions[0]
      : result.photo_sessions;
    const [{ data: signed, error: signedError }, { data: room }] =
      await Promise.all([
        admin.storage
          .from("photobox-results")
          .createSignedUrl(result.storage_path, 300),
        admin
          .from("photobox_rooms")
          .select("code")
          .eq("id", session?.room_id)
          .single()
      ]);
    if (signedError || !signed?.signedUrl)
      return fail("PREVIEW_UNAVAILABLE", "Preview hasil tidak tersedia.", 503);

    return ok({
      ...result,
      roomId: session?.room_id,
      roomCode: room?.code,
      signedUrl: signed.signedUrl
    });
  } catch (error) {
    return safeError(error);
  }
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const auth = await requireUser();
    if (!auth) return fail("UNAUTHORIZED", "Sesi tidak ditemukan.", 401);
    const { resultId } = await params;
    const result = await allowed(resultId, auth.user.id);
    if (!result)
      return fail("RESULT_NOT_FOUND", "Hasil tidak ditemukan.", 404);
    return ok(await generateResult(result.session_id, { force: true }));
  } catch (error) {
    return safeError(error);
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const auth = await requireUser();
    if (!auth) return fail("UNAUTHORIZED", "Sesi tidak ditemukan.", 401);
    const { resultId } = await params;
    const result = await allowed(resultId, auth.user.id);
    if (!result)
      return fail("RESULT_NOT_FOUND", "Hasil tidak ditemukan.", 404);
    const admin = createAdminClient();
    await admin.storage
      .from("photobox-results")
      .remove(
        [result.storage_path, result.thumbnail_path].filter(Boolean)
      );
    await admin.from("photobox_results").delete().eq("id", resultId);
    return ok({ deleted: true });
  } catch (error) {
    return safeError(error);
  }
}
