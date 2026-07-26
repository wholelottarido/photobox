import "server-only";

import sharp, { type OverlayOptions } from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

type Config = {
  background?: string;
  textColor?: string;
  title?: string;
  grayscale?: boolean;
  borderWidth?: number;
  gap?: number;
};

type GenerateOptions = {
  force?: boolean;
};

function exactArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

export async function generateResult(
  sessionId: string,
  options: GenerateOptions = {}
) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("photobox_results")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing && !options.force) return existing;

  const { data: session } = await admin
    .from("photo_sessions")
    .select(
      "id,room_id,photobox_rooms!inner(total_shots,theme_id,photobox_themes(configuration))"
    )
    .eq("id", sessionId)
    .single();
  if (!session) throw new Error("SESSION_NOT_FOUND");

  const room = Array.isArray(session.photobox_rooms)
    ? session.photobox_rooms[0]
    : session.photobox_rooms;
  const total = Number(room?.total_shots || 4);
  const expected = total * 2;
  const { data: shots } = await admin
    .from("photo_shots")
    .select(
      "storage_path,shot_number,participant_id,room_participants(role)"
    )
    .eq("session_id", sessionId)
    .eq("status", "uploaded")
    .order("shot_number");
  if (!shots || shots.length < expected) throw new Error("SHOTS_INCOMPLETE");

  const rawConfig = room?.photobox_themes as unknown as
    | { configuration?: Config }
    | { configuration?: Config }[]
    | null;
  const config =
    (Array.isArray(rawConfig)
      ? rawConfig[0]?.configuration
      : rawConfig?.configuration) || {};
  const width = 1200;
  const height = 1800;
  const border = Math.max(18, Number(config.borderWidth || 28));
  const gap = Math.max(8, Number(config.gap || 14));
  const footer = 140;
  const cellW = Math.floor((width - border * 2 - gap) / 2);
  const cellH = Math.floor(
    (height - footer - border * 2 - gap * (total - 1)) / total
  );

  const composite: OverlayOptions[] = [];
  for (const shot of shots) {
    const roleRaw = shot.room_participants as unknown as
      | { role: string }
      | { role: string }[];
    const role = Array.isArray(roleRaw) ? roleRaw[0]?.role : roleRaw?.role;
    const col = role === "guest" ? 1 : 0;
    const row = Number(shot.shot_number) - 1;
    const { data, error } = await admin.storage
      .from("photobox-raw")
      .download(shot.storage_path!);
    if (error || !data) throw new Error("IMAGE_DOWNLOAD_FAILED");

    let image = sharp(Buffer.from(await data.arrayBuffer()))
      .rotate()
      .resize(cellW, cellH, { fit: "cover" });
    if (config.grayscale) image = image.grayscale();
    composite.push({
      input: await image.jpeg({ quality: 92 }).toBuffer(),
      left: border + col * (cellW + gap),
      top: border + row * (cellH + gap)
    });
  }

  const bg = config.background || "#ffe7ee";
  const fg = config.textColor || "#2a1520";
  const title = String(config.title || "TOGETHER, ANYWHERE").replace(
    /[<>&]/g,
    ""
  );
  const svg = Buffer.from(
    `<svg width="${width}" height="${footer}"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="60" text-anchor="middle" font-family="Arial" font-size="38" font-weight="800" fill="${fg}">${title}</text><text x="50%" y="103" text-anchor="middle" font-family="Arial" font-size="22" fill="${fg}">${new Date().toISOString().slice(0, 10)} · PHOTOBOX GT</text></svg>`
  );

  const output = await sharp({
    create: { width, height, channels: 3, background: bg }
  })
    .composite([...composite, { input: svg, left: 0, top: height - footer }])
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();
  const thumb = await sharp(output)
    .resize({ width: 400 })
    .jpeg({ quality: 82 })
    .toBuffer();

  const id = existing?.id || crypto.randomUUID();
  const path = `${session.room_id}/${sessionId}/${id}.jpg`;
  const thumbPath = `${session.room_id}/${sessionId}/${id}-thumb.jpg`;
  const resultStorage = admin.storage.from("photobox-results");

  const { error: outputError } = await resultStorage.upload(
    path,
    exactArrayBuffer(output),
    { contentType: "image/jpeg", upsert: true }
  );
  if (outputError) throw new Error(`RESULT_UPLOAD_FAILED: ${outputError.message}`);

  const { error: thumbError } = await resultStorage.upload(
    thumbPath,
    exactArrayBuffer(thumb),
    { contentType: "image/jpeg", upsert: true }
  );
  if (thumbError) {
    await resultStorage.remove([path]);
    throw new Error(`THUMBNAIL_UPLOAD_FAILED: ${thumbError.message}`);
  }

  const { data: verification, error: verificationError } =
    await resultStorage.download(path);
  if (verificationError || !verification) {
    await resultStorage.remove([path, thumbPath]);
    throw new Error("RESULT_VERIFICATION_FAILED");
  }
  try {
    const metadata = await sharp(
      Buffer.from(await verification.arrayBuffer())
    ).metadata();
    if (
      metadata.format !== "jpeg" ||
      metadata.width !== width ||
      metadata.height !== height
    ) {
      throw new Error("INVALID_RESULT_IMAGE");
    }
  } catch {
    await resultStorage.remove([path, thumbPath]);
    throw new Error("RESULT_VERIFICATION_FAILED");
  }

  const expires = new Date(Date.now() + 86400000).toISOString();
  const values = {
    theme_id: room?.theme_id,
    storage_path: path,
    thumbnail_path: thumbPath,
    width,
    height,
    mime_type: "image/jpeg",
    size_bytes: output.byteLength,
    expires_at: expires
  };
  const resultQuery = existing
    ? admin
        .from("photobox_results")
        .update(values)
        .eq("id", existing.id)
    : admin.from("photobox_results").insert({
        id,
        session_id: sessionId,
        ...values
      });
  const { data: result, error } = await resultQuery.select("*").single();
  if (error) {
    const { data: concurrent } = await admin
      .from("photobox_results")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    const pathsBelongToConcurrent =
      concurrent?.storage_path === path ||
      concurrent?.thumbnail_path === thumbPath;
    if (!pathsBelongToConcurrent)
      await resultStorage.remove([path, thumbPath]);
    if (concurrent) return concurrent;
    throw error;
  }

  if (existing) {
    const supersededPaths = [
      existing.storage_path,
      existing.thumbnail_path
    ].filter(
      (oldPath): oldPath is string =>
        Boolean(oldPath) && oldPath !== path && oldPath !== thumbPath
    );
    if (supersededPaths.length) await resultStorage.remove(supersededPaths);
  }

  await admin
    .from("photo_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  await admin
    .from("photobox_rooms")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", session.room_id);
  return result;
}
