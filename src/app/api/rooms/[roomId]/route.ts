import { requireUser } from "@/lib/supabase/server"; import { createAdminClient } from "@/lib/supabase/admin"; import { fail,ok,safeError } from "@/lib/api";
export async function GET(_:Request,{params}:{params:Promise<{roomId:string}>}){
 try{const auth=await requireUser();if(!auth)return fail("UNAUTHORIZED","Sesi tidak ditemukan.",401);const {roomId:code}=await params;const admin=createAdminClient();
 const {data:room}=await admin.from("photobox_rooms").select("id,code,status,total_shots,countdown_seconds,expires_at,theme_id").eq("code",code.toUpperCase()).single();if(!room)return fail("ROOM_NOT_FOUND","Room tidak ditemukan.",404);
 const {data:mine}=await admin.from("room_participants").select("id,role").eq("room_id",room.id).eq("user_id",auth.user.id).is("left_at",null).maybeSingle();if(!mine)return fail("NOT_ROOM_MEMBER","Kamu bukan anggota room ini.",403);
 const {data:participants}=await admin.from("room_participants").select("id,user_id,role,display_name,is_ready,connection_status").eq("room_id",room.id).is("left_at",null).order("joined_at");
 const {data:session}=await admin.from("photo_sessions").select("id,status,current_shot").eq("room_id",room.id).order("sequence_number",{ascending:false}).limit(1).maybeSingle();
 const {data:captureEvent}=session?await admin.from("capture_events").select("shot_number,capture_at,status").eq("session_id",session.id).order("shot_number").limit(1).maybeSingle():{data:null};
 return ok({...room,me:mine,participants:participants||[],session,captureEvent});}catch(e){return safeError(e);}
}

export async function DELETE(_:Request,{params}:{params:Promise<{roomId:string}>}){
 try{const auth=await requireUser();if(!auth)return fail("UNAUTHORIZED","Sesi tidak ditemukan.",401);const {roomId}=await params,admin=createAdminClient();const {data:room}=await admin.from("photobox_rooms").select("id,host_user_id").or(`id.eq.${roomId},code.eq.${roomId.toUpperCase()}`).maybeSingle();if(!room)return fail("ROOM_NOT_FOUND","Room tidak ditemukan.",404);if(room.host_user_id!==auth.user.id)return fail("NOT_ROOM_HOST","Hanya host dapat menghapus room.",403);const [{data:raw},{data:results}]=await Promise.all([admin.storage.from("photobox-raw").list(room.id),admin.storage.from("photobox-results").list(room.id)]);const rawPaths=(raw||[]).map(x=>`${room.id}/${x.name}`),resultPaths=(results||[]).map(x=>`${room.id}/${x.name}`);if(rawPaths.length)await admin.storage.from("photobox-raw").remove(rawPaths);if(resultPaths.length)await admin.storage.from("photobox-results").remove(resultPaths);await admin.from("photobox_rooms").delete().eq("id",room.id);return ok({deleted:true});}catch(e){return safeError(e);}
}
