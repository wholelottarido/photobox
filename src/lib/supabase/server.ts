import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
export async function createClient(){
  const store=await cookies();
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) throw new Error("Supabase belum dikonfigurasi.");
  return createServerClient(url,key,{cookies:{getAll:()=>store.getAll(),setAll(items:{name:string;value:string;options:CookieOptions}[]){try{items.forEach(({name,value,options})=>store.set(name,value,options));}catch{}}}});
}
export async function requireUser(){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user) return null; return {supabase,user};
}
