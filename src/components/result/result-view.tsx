"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Share2, Trash2 } from "lucide-react";
import { ErrorNotice, Loading } from "@/components/ui/states";

type Result = {
  signedUrl: string;
  expires_at: string;
  roomId: string;
  roomCode: string;
  mime_type: string;
};

export function ResultView({ resultId }: { resultId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const repairAttempted = useRef(false);

  const loadResult = useCallback(async () => {
    const response = await fetch(`/api/results/${resultId}`, {
      cache: "no-store"
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setResult(body.data);
  }, [resultId]);

  useEffect(() => {
    loadResult().catch((cause: Error) => setError(cause.message));
  }, [loadResult]);

  if (error) return <ErrorNotice message={error} />;
  if (!result) return <Loading label="Menyusun strip photobox…" />;
  const current = result;

  async function repairPreview() {
    if (repairAttempted.current) return;
    repairAttempted.current = true;
    setRepairing(true);
    try {
      const response = await fetch(`/api/results/${resultId}`, {
        method: "POST"
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error?.message || "Hasil foto gagal dibuat ulang."
        );
      await loadResult();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Hasil foto gagal dibuat ulang."
      );
    } finally {
      setRepairing(false);
    }
  }

  async function download() {
    const response = await fetch(`/api/results/${resultId}/download-url`, { method: "POST" });
    const body = await response.json();
    if (response.ok) location.href = body.data.url;
  }

  async function share() {
    if (navigator.share) await navigator.share({ title: "PhotoBox GT", url: location.href });
    else {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
    }
  }

  async function retake() {
    const response = await fetch(`/api/rooms/${current.roomId}/retake`, { method: "POST" });
    const body = await response.json();
    if (response.ok) router.push(`/room/${current.roomCode}/capture?session=${body.data.session_id}`);
    else setError(body.error?.message);
  }

  return <>
    <div className="eyebrow">Hasil photobox</div>
    <h1 style={{ fontSize: "clamp(38px,6vw,64px)", letterSpacing: "-.04em", margin: "10px 0" }}>Momen kalian jadi satu. ✦</h1>
    <p className="muted">Tersimpan sampai {new Date(result.expires_at).toLocaleString("id-ID")}.</p>
    <div className="grid2" style={{ alignItems: "start", marginTop: 30 }}>
      <div className="glass card" style={{ display: "grid", placeItems: "center" }}>
        {repairing ? (
          <Loading label="Memperbaiki dan menyusun ulang hasil JPEG…" />
        ) : (
          <Image
            unoptimized
            src={result.signedUrl}
            alt="Strip photobox hasil sesi"
            width={1200}
            height={1800}
            onError={() => void repairPreview()}
            style={{
              width: "min(100%,440px)",
              height: "auto",
              borderRadius: 12
            }}
          />
        )}
      </div>
      <div className="glass card">
        <h2>Bagikan momennya</h2>
        <p className="muted">Link hanya dapat dibuka oleh peserta room. URL file unduhan berlaku singkat.</p>
        <div style={{ display: "grid", gap: 10 }}>
          <button className="btn btn-primary" disabled={repairing} onClick={download}><Download size={18} />Unduh JPEG</button>
          <button className="btn btn-secondary" onClick={share}><Share2 size={18} />Bagikan</button>
          <button className="btn btn-secondary" onClick={async () => { await navigator.clipboard.writeText(location.href); setCopied(true); }}><Copy size={18} />{copied ? "Tersalin" : "Salin link"}</button>
          <button className="btn btn-secondary" onClick={retake}>Ambil ulang</button>
          <button className="btn btn-secondary" style={{ color: "var(--danger)" }} onClick={async () => {
            if (confirm("Hapus hasil ini permanen?")) {
              await fetch(`/api/results/${resultId}`, { method: "DELETE" });
              router.push("/");
            }
          }}><Trash2 size={18} />Hapus hasil</button>
        </div>
      </div>
    </div>
  </>;
}
