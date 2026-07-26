import Link from "next/link";
import { ArrowRight, Lock, Radio, Sparkles } from "lucide-react";
import { PhotoStrip } from "@/components/ui/photostrip";
import { JoinRoomForm } from "@/components/landing/join-room-form";

export default function Home() {
  return <main>
    <section className="container" style={{minHeight:"70vh",display:"grid",gridTemplateColumns:"minmax(0,1.2fr) minmax(260px,.8fr)",alignItems:"center",gap:64,padding:"70px 0"}}>
      <div>
        <div className="eyebrow">Photobox online untuk berdua</div>
        <h1 style={{fontSize:"clamp(44px,7vw,82px)",lineHeight:.98,letterSpacing:"-.055em",margin:"18px 0 24px",maxWidth:780}}>Foto bareng,<br/><span style={{color:"var(--primary)"}}>meski berjauhan.</span></h1>
        <p className="muted" style={{fontSize:18,lineHeight:1.7,maxWidth:620}}>Masuk ke satu ruang privat, bertemu lewat kamera, lalu abadikan momen yang diambil bersamaan—langsung menjadi strip photobox.</p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:30}}>
          <Link href="/create" className="btn btn-primary">Buat Photobox <ArrowRight size={18}/></Link>
          <JoinRoomForm/>
        </div>
      </div>
      <div style={{display:"grid",placeItems:"center",position:"relative"}}>
        <div style={{position:"absolute",width:300,height:300,borderRadius:999,background:"rgba(255,142,177,.18)",filter:"blur(50px)"}}/>
        <PhotoStrip/>
      </div>
    </section>
    <section className="container grid2" style={{padding:"50px 0"}}>
      {[["1",Radio,"Buat ruang privat","Atur tema, timer, dan jumlah pose."],["2",Lock,"Undang satu orang","Bagikan tautan aman yang hanya berlaku sekali."],["3",Sparkles,"Jepret serempak","Countdown tersinkron lalu hasil dirangkai otomatis."]].map(([n,Icon,title,desc])=><article className="glass card" key={String(n)}><Icon color="var(--primary)"/><div className="eyebrow" style={{marginTop:22}}>Langkah {String(n)}</div><h2 style={{margin:"8px 0"}}>{String(title)}</h2><p className="muted" style={{lineHeight:1.6}}>{String(desc)}</p></article>)}
    </section>
    <section className="container glass card" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:24,marginTop:30}}>
      <div><h2 style={{marginTop:0}}>Momenmu tetap privat.</h2><p className="muted" style={{marginBottom:0}}>Kamera hanya aktif setelah izin. Video dan audio tidak direkam. Foto disimpan sementara dan bisa dihapus kapan saja.</p></div>
      <Link href="/privacy" className="btn btn-secondary">Pelajari privasi</Link>
    </section>
  </main>;
}
