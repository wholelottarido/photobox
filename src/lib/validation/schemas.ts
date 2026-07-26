import { z } from "zod";
export const displayName=z.string().trim().min(1,"Nama wajib diisi.").max(50);
export const createRoomSchema=z.object({displayName,themeSlug:z.string().regex(/^[a-z0-9-]+$/).default("pink-love"),totalShots:z.coerce.number().int().min(1).max(8).default(4),countdownSeconds:z.coerce.number().int().min(1).max(10).default(3),invitationMessage:z.string().trim().max(500).default("Yuk foto bareng!"),expiresHours:z.coerce.number().int().min(1).max(168).default(24)});
export const acceptInvitationSchema=z.object({displayName});
export const readySchema=z.object({ready:z.boolean()});
export const confirmShotSchema=z.object({storagePath:z.string().min(1).max(500),mimeType:z.enum(["image/webp","image/jpeg"]),width:z.number().int().positive().max(4096),height:z.number().int().positive().max(4096),sizeBytes:z.number().int().positive().max(6*1024*1024),checksumSha256:z.string().regex(/^[a-f0-9]{64}$/),clientCapturedAt:z.string().datetime()});
