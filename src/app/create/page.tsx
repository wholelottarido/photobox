import type { Metadata } from "next";
import { CreateRoomForm } from "@/components/room/create-room-form";
import { SessionGate } from "@/components/auth/session-gate";
export const metadata:Metadata={title:"Buat Photobox"};
export default function CreatePage(){return <main className="container" style={{padding:"50px 0"}}><div className="eyebrow">Ruang baru</div><h1 style={{fontSize:"clamp(36px,6vw,62px)",margin:"12px 0 10px",letterSpacing:"-.04em"}}>Atur sesi kalian.</h1><p className="muted" style={{marginBottom:30}}>Sesudah dibuat, kamu mendapat tautan undangan privat untuk satu orang.</p><SessionGate><CreateRoomForm/></SessionGate></main>}
