"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Copy,Check,ArrowRight } from "lucide-react";
import { PhotoStrip } from "@/components/ui/photostrip";
type Values={displayName:string;themeSlug:string;totalShots:number;countdownSeconds:number;invitationMessage:string;expiresHours:number};
export function CreateRoomForm(){
 const router=useRouter(),[created,setCreated]=useState<{code:string;invitationUrl:string}|null>(null),[error,setError]=useState(""),[copied,setCopied]=useState(false);
 const {register,handleSubmit,formState:{isSubmitting,errors}}=useForm<Values>({defaultValues:{themeSlug:"pink-love",totalShots:4,countdownSeconds:3,invitationMessage:"Yuk foto bareng!",expiresHours:24}});
 async function submit(v:Values){setError(""); const r=await fetch("/api/rooms",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(v)}); const j=await r.json(); if(!r.ok){setError(j.error?.message||"Room gagal dibuat.");return;} setCreated(j.data);}
 if(created)return <div className="glass card" style={{maxWidth:680}}><div className="eyebrow">Room siap</div><h2 style={{fontSize:34}}>Undang temanmu ✦</h2><p className="muted">Room code: <strong style={{color:"white",letterSpacing:4}}>{created.code}</strong></p><div style={{display:"flex",gap:8}}><input readOnly className="field" value={created.invitationUrl}/><button className="btn btn-primary" aria-label="Salin tautan" onClick={async()=>{await navigator.clipboard.writeText(created.invitationUrl);setCopied(true)}}>{copied?<Check/>:<Copy/>}</button></div><button className="btn btn-secondary" style={{marginTop:18}} onClick={()=>router.push(`/room/${created.code}`)}>Masuk waiting room <ArrowRight size={17}/></button></div>;
 return <form onSubmit={handleSubmit(submit)} className="glass card grid2"><div style={{display:"grid",gap:18}}>
   <label><span className="label">Nama kamu</span><input className="field" {...register("displayName",{required:true,maxLength:50})} placeholder="Misalnya, Rani"/>{errors.displayName&&<small style={{color:"var(--danger)"}}>Nama wajib diisi.</small>}</label>
   <label><span className="label">Tema</span><select className="field" {...register("themeSlug")}><option value="pink-love">Pink Love</option><option value="classic">Classic</option><option value="film-001">Film 001</option><option value="vintage">Vintage</option><option value="black-white">Black & White</option></select></label>
   <div className="grid2"><label><span className="label">Jumlah foto</span><input type="number" min="1" max="8" className="field" {...register("totalShots",{valueAsNumber:true})}/></label><label><span className="label">Countdown</span><select className="field" {...register("countdownSeconds",{valueAsNumber:true})}>{[1,3,5,10].map(n=><option key={n} value={n}>{n} detik</option>)}</select></label></div>
   <label><span className="label">Pesan undangan</span><textarea className="field" rows={3} maxLength={500} {...register("invitationMessage")}/></label>
   <label><span className="label">Undangan berlaku</span><select className="field" {...register("expiresHours",{valueAsNumber:true})}><option value="1">1 jam</option><option value="24">24 jam</option><option value="72">3 hari</option></select></label>
   {error&&<div role="alert" style={{color:"var(--danger)"}}>{error}</div>}<button disabled={isSubmitting} className="btn btn-primary">{isSubmitting?"Membuat…":"Buat Room"}</button>
 </div><div style={{display:"grid",placeItems:"center"}}><PhotoStrip compact/></div></form>;
}
