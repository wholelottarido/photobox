"use client";
import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function useAnonymousSession(){
  const [state,setState]=useState<"loading"|"ready"|"error">("loading");
  useEffect(()=>{
    try {
      const supabase=createClient();
      supabase.auth.getSession()
        .then(async({data})=>{
          if(!data.session){
            const {error}=await supabase.auth.signInAnonymously();
            if(error) throw error;
          }
          setState("ready");
        })
        .catch(()=>setState("error"));
    } catch {
      setState("error");
    }
  },[]);
  return state;
}
