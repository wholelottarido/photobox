import { createRoomSchema } from "@/lib/validation/schemas";
import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createInvitationToken,hashInvitationToken } from "@/lib/invitations/crypto";
import { generateRoomCode } from "@/lib/rooms/code";
import { env } from "@/lib/env";
import { fail,json,ok,safeError } from "@/lib/api";

export async function POST(req:Request){
 try{
  const auth=await requireUser(); if(!auth)return fail("UNAUTHORIZED","Sesi tidak ditemukan.",401);
  const parsed=createRoomSchema.safeParse(await json(req)); if(!parsed.success)return fail("VALIDATION_ERROR",parsed.error.issues[0]?.message||"Data tidak valid.",422);
  const admin=createAdminClient(),input=parsed.data,e=env();
  const {count}=await admin.from("photobox_rooms").select("id",{count:"exact",head:true}).eq("host_user_id",auth.user.id).gte("created_at",new Date(Date.now()-60000).toISOString());if((count||0)>=3)return fail("RATE_LIMITED","Terlalu banyak room dibuat. Tunggu sebentar.",429);
  const {data:theme,error:themeError}=await admin.from("photobox_themes").select("id").eq("slug",input.themeSlug).eq("is_active",true).single();
  if(themeError){
    if(themeError.code==="PGRST205"||themeError.code==="42P01")return fail("DATABASE_NOT_INITIALIZED","Database PhotoBox belum disiapkan. Jalankan migration dan seed Supabase.",503);
    return fail("SUPABASE_CONFIGURATION_ERROR","Supabase tidak dapat diakses. Periksa server secret dan konfigurasi project.",503);
  }
  if(!theme)return fail("THEME_NOT_FOUND","Tema tidak tersedia.",422);
  let room:null|{id:string;code:string}=null;
  for(let i=0;i<6&&!room;i++){const code=generateRoomCode();const {data,error}=await admin.from("photobox_rooms").insert({code,host_user_id:auth.user.id,theme_id:theme.id,total_shots:input.totalShots,countdown_seconds:input.countdownSeconds,invitation_message:input.invitationMessage,expires_at:new Date(Date.now()+input.expiresHours*3600000).toISOString(),status:"waiting"}).select("id,code").single();if(!error)room=data;}
  if(!room)return fail("ROOM_CREATE_FAILED","Room belum dapat dibuat. Coba lagi.",500);
  await admin.from("profiles").upsert({id:auth.user.id,display_name:input.displayName},{onConflict:"id"});
  await admin.from("room_participants").insert({room_id:room.id,user_id:auth.user.id,role:"host",display_name:input.displayName,connection_status:"connecting"});
  const token=createInvitationToken();
  await admin.from("room_invitations").insert({room_id:room.id,token_hash:hashInvitationToken(token,e.INVITATION_TOKEN_PEPPER),expires_at:new Date(Date.now()+input.expiresHours*3600000).toISOString()});
  await admin.from("audit_events").insert({room_id:room.id,user_id:auth.user.id,event_type:"room.created",metadata:{theme:input.themeSlug}});
  const requestOrigin=new URL(req.url).origin;
  const configuredOrigin=e.NEXT_PUBLIC_APP_URL.replace(/\/$/,"");
  const publicOrigin=configuredOrigin.includes("localhost")&&!requestOrigin.includes("localhost")
    ? requestOrigin
    : configuredOrigin;
  return ok({id:room.id,code:room.code,invitationUrl:`${publicOrigin}/invite/${token}`},201);
 }catch(error){return safeError(error);}
}
