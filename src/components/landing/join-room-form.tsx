"use client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
export function JoinRoomForm() {
  const router=useRouter(); const [code,setCode]=useState("");
  function submit(e:FormEvent){e.preventDefault(); const clean=code.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,"").slice(0,6); if(clean.length===6) router.push(`/room/${clean}`);}
  return <form onSubmit={submit} style={{display:"flex",gap:8}}><label className="sr-only" htmlFor="room-code">Masukkan room code</label><input id="room-code" className="field" style={{width:190,textTransform:"uppercase",letterSpacing:3}} placeholder="ROOM CODE" value={code} onChange={e=>setCode(e.target.value)} maxLength={6}/><button className="btn btn-secondary">Masuk</button></form>;
}
