"use client";
import {useEffect} from "react";import {createClient} from "@/lib/supabase/client";
export function useRoomRealtime(roomId:string|undefined,onChange:()=>void){useEffect(()=>{if(!roomId)return;const s=createClient(),ch=s.channel(`room:${roomId}`).on("postgres_changes",{event:"*",schema:"public",table:"room_participants",filter:`room_id=eq.${roomId}`},onChange).on("postgres_changes",{event:"*",schema:"public",table:"photo_sessions",filter:`room_id=eq.${roomId}`},onChange).subscribe();return()=>{void s.removeChannel(ch)}},[roomId,onChange]);}
