import type { Metadata } from "next";
import Link from "next/link";
import { Camera } from "lucide-react";
import "@livekit/components-styles";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PhotoBox GT", template: "%s · PhotoBox GT" },
  description: "Foto bareng, meski berjauhan."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>
    <header className="container" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"22px 0"}}>
      <Link href="/" aria-label="PhotoBox GT beranda" style={{display:"flex",alignItems:"center",gap:10,fontWeight:950}}>
        <span style={{display:"grid",placeItems:"center",width:38,height:38,borderRadius:12,background:"var(--primary)",color:"#270d18"}}><Camera size={21}/></span>
        PhotoBox <span style={{color:"var(--primary)"}}>GT</span>
      </Link>
      <Link className="muted" href="/privacy" style={{fontSize:14}}>Privasi</Link>
    </header>
    {children}
    <footer className="container muted" style={{padding:"64px 0 32px",fontSize:13}}>© {new Date().getFullYear()} PhotoBox GT · Video dan audio tidak direkam.</footer>
  </body></html>;
}
