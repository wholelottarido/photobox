import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, safeError } from "@/lib/api";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const auth = await requireUser();
    if (!auth) return fail("UNAUTHORIZED", "Sesi tidak ditemukan.", 401);
    const { resultId } = await params;
    const admin = createAdminClient();
    const { data: result } = await admin
      .from("photobox_results")
      .select(
        "storage_path,mime_type,expires_at,photo_sessions!inner(room_id)"
      )
      .eq("id", resultId)
      .maybeSingle();
    if (!result)
      return fail("RESULT_NOT_FOUND", "Hasil tidak ditemukan.", 404);

    const session = Array.isArray(result.photo_sessions)
      ? result.photo_sessions[0]
      : result.photo_sessions;
    const { data: member } = await admin
      .from("room_participants")
      .select("id")
      .eq("room_id", session?.room_id)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!member)
      return fail(
        "FORBIDDEN",
        "Kamu tidak dapat mengakses hasil ini.",
        403
      );

    const extension =
      result.mime_type === "image/png"
        ? "png"
        : result.mime_type === "image/jpeg"
          ? "jpg"
          : "webp";
    const { data: signed, error } = await admin.storage
      .from("photobox-results")
      .createSignedUrl(result.storage_path, 60, {
        download: `photobox-gt-${resultId}.${extension}`
      });
    if (error || !signed?.signedUrl)
      return fail("DOWNLOAD_UNAVAILABLE", "File belum dapat diunduh.", 503);
    return ok({ url: signed.signedUrl, expiresIn: 60 });
  } catch (error) {
    return safeError(error);
  }
}
