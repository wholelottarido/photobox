"use client";
export function ErrorNotice({ message }: { message: string }) {
  return <div role="alert" style={{padding:12,borderRadius:12,color:"#ffdce1",background:"rgba(255,107,122,.13)",border:"1px solid rgba(255,107,122,.35)"}}>{message}</div>;
}
export function Loading({ label="Memuat…" }: { label?:string }) {
  return <div role="status" aria-live="polite" className="muted" style={{padding:28,textAlign:"center"}}>{label}</div>;
}
