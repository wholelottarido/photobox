"use client";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { ErrorNotice,Loading } from "@/components/ui/states";
export function SessionGate({children}:{children:React.ReactNode}){const s=useAnonymousSession(); if(s==="loading")return <Loading label="Menyiapkan ruang privat…"/>; if(s==="error")return <ErrorNotice message="Sesi privat tidak dapat dibuat. Periksa konfigurasi Supabase dan coba lagi."/>; return children;}
