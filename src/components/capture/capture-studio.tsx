"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from "@livekit/components-react";
import { useCameraCapture } from "@/hooks/use-camera-capture";
import { ErrorNotice } from "@/components/ui/states";
import { serverOffset } from "@/lib/capture/schedule";

type LiveConnection = { token: string; url: string };

export function CaptureStudio({ code, sessionId }: { code: string; sessionId: string }) {
  const router = useRouter();
  const { videoRef, capture, error: cameraError } = useCameraCapture();
  const [shot, setShot] = useState(1);
  const [total, setTotal] = useState(4);
  const [count, setCount] = useState(3);
  const [status, setStatus] = useState("Bersiap…");
  const [fatal, setFatal] = useState("");
  const [live, setLive] = useState<LiveConnection>();

  useEffect(() => {
    if (!sessionId) {
      setFatal("Sesi capture tidak ditemukan.");
      return;
    }
    let cancelled = false;
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    async function run() {
      try {
        const started = Date.now();
        const [roomResponse, timeResponse] = await Promise.all([
          fetch(`/api/rooms/${code}`, { cache: "no-store" }),
          fetch("/api/time", { cache: "no-store" })
        ]);
        const received = Date.now();
        const roomBody = await roomResponse.json();
        const timeBody = await timeResponse.json();
        if (!roomResponse.ok) throw new Error(roomBody.error?.message);

        const tokenResponse = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ roomId: roomBody.data.id })
        });
        const tokenBody = await tokenResponse.json();
        if (tokenResponse.ok) setLive(tokenBody.data);

        const totalShots = Number(roomBody.data.total_shots);
        const countdownSeconds = Number(roomBody.data.countdown_seconds);
        const offset = serverOffset(timeBody.data.epochMs, started, received);
        const firstCaptureAt = roomBody.data.captureEvent?.capture_at
          ? new Date(roomBody.data.captureEvent.capture_at).getTime()
          : Date.now() + offset + countdownSeconds * 1000;
        setTotal(totalShots);

        for (let number = 1; number <= totalShots && !cancelled; number++) {
          setShot(number);
          const captureAt = number === 1 ? firstCaptureAt : Date.now() + offset + countdownSeconds * 1000;
          while (!cancelled) {
            const remaining = captureAt - (Date.now() + offset);
            if (remaining <= 0) break;
            setCount(Math.max(1, Math.ceil(remaining / 1000)));
            setStatus("Bersiap…");
            await wait(Math.min(250, remaining));
          }

          setCount(0);
          setStatus("Jepret!");
          const { blob, width, height } = await capture();
          const uploadResponse = await fetch(`/api/sessions/${sessionId}/shots/${number}/upload-url`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}"
          });
          const uploadBody = await uploadResponse.json();
          if (!uploadResponse.ok) throw new Error(uploadBody.error?.message || "Upload gagal.");
          const upload = await fetch(uploadBody.data.signedUrl, { method: "PUT", headers: { "content-type": "image/webp" }, body: blob });
          if (!upload.ok) throw new Error("UPLOAD_FAILED");

          const checksum = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())))
            .map((byte) => byte.toString(16).padStart(2, "0")).join("");
          const confirm = await fetch(`/api/sessions/${sessionId}/shots/${number}/confirm`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              storagePath: uploadBody.data.path,
              mimeType: "image/webp",
              width,
              height,
              sizeBytes: blob.size,
              checksumSha256: checksum,
              clientCapturedAt: new Date().toISOString()
            })
          });
          if (!confirm.ok) {
            const confirmBody = await confirm.json().catch(() => null);
            throw new Error(confirmBody?.error?.message || "Konfirmasi foto gagal.");
          }
          await wait(650);
        }

        if (!cancelled) {
          setStatus("Menyusun hasil…");
          for (let attempt = 0; attempt < 12; attempt++) {
            const response = await fetch(`/api/sessions/${sessionId}/generate`, { method: "POST" });
            const body = await response.json();
            if (response.ok) {
              router.replace(`/result/${body.data.id}`);
              return;
            }
            if (body.error?.code !== "SHOTS_INCOMPLETE") throw new Error(body.error?.message || "Hasil gagal dibuat.");
            await wait(2500);
          }
          throw new Error("UPLOAD_TIMEOUT: Foto peserta lain belum lengkap.");
        }
      } catch (cause) {
        if (!cancelled) setFatal(cause instanceof Error ? cause.message : "Capture gagal.");
      }
    }

    const timer = setTimeout(run, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [capture, code, router, sessionId]);

  return <div style={{ position: "fixed", inset: 0, zIndex: 20, background: "#050914", display: "grid", placeItems: "center", padding: 18, overflow: "auto" }}>
    <div style={{ width: "min(1100px,100%)" }}>
      {(fatal || cameraError) && <ErrorNotice message={fatal || cameraError} />}
      <div className="eyebrow" style={{ textAlign: "center" }}>Foto {shot} dari {total}</div>
      <div aria-live="assertive" style={{ fontSize: "clamp(64px,13vw,140px)", fontWeight: 950, textAlign: "center", lineHeight: 1, color: count ? "white" : "var(--primary)", margin: "12px 0" }}>{count || "✦"}</div>
      <div className="grid2">
        <div className="glass" style={{ borderRadius: 24, overflow: "hidden", aspectRatio: "4/3" }}>
          <video ref={videoRef} muted playsInline aria-label="Kamera lokal untuk foto" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
        </div>
        <div className="glass" style={{ borderRadius: 24, overflow: "hidden", aspectRatio: "4/3" }}>
          {live
            ? <LiveKitRoom token={live.token} serverUrl={live.url} connect audio={false} video={false}><VideoConference /><RoomAudioRenderer /></LiveKitRoom>
            : <div className="muted" style={{ display: "grid", placeItems: "center", height: "100%" }}>Menyambungkan video pasangan…</div>}
        </div>
      </div>
      <p aria-live="polite" style={{ textAlign: "center", fontWeight: 800 }}>{status}</p>
      <div style={{ height: 6, borderRadius: 99, background: "var(--panel)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(shot / total) * 100}%`, background: "var(--primary)", transition: "width .3s" }} />
      </div>
    </div>
  </div>;
}
