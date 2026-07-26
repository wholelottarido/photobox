"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ControlBar,
  GridLayout,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Check, Copy, LogOut, Radio, Users } from "lucide-react";
import { ErrorNotice, Loading } from "@/components/ui/states";
import { useRoomRealtime } from "@/hooks/use-room-realtime";

type Room = {
  id: string;
  code: string;
  status: string;
  me: { id: string; role: "host" | "guest" };
  participants: {
    id: string;
    role: string;
    display_name: string;
    is_ready: boolean;
    connection_status: string;
  }[];
  session?: { id: string; status: string } | null;
};

function RoomMedia() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false
  });
  return <LayoutContextProvider>
    <div className="room-media">
      <GridLayout tracks={tracks} className="room-video-grid">
        <ParticipantTile />
      </GridLayout>
      <ControlBar
        className="room-control-bar"
        variation="minimal"
        controls={{
          microphone: true,
          camera: true,
          screenShare: false,
          chat: false,
          leave: false,
          settings: true
        }}
      />
    </div>
  </LayoutContextProvider>;
}

export function RoomLobby({ code }: { code: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<Room>();
  const [token, setToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error?.message);
      return;
    }
    setRoom(body.data);
    if (body.data.session?.id && ["capturing", "countdown", "uploading"].includes(body.data.session.status)) {
      router.replace(`/room/${code}/capture?session=${body.data.session.id}`);
    }
  }, [code, router]);

  useEffect(() => { void load(); }, [load]);
  useRoomRealtime(room?.id, load);

  useEffect(() => {
    if (!room?.id || token) return;
    fetch("/api/livekit/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId: room.id })
    })
      .then((response) => response.json())
      .then((body) => {
        if (body.success) {
          setToken(body.data.token);
          setLivekitUrl(body.data.url);
        } else setError(body.error.message);
      })
      .catch(() => setError("Live video tidak dapat tersambung."));
  }, [room?.id, token]);

  if (error) return <ErrorNotice message={error} />;
  if (!room) return <Loading label="Masuk ke waiting room…" />;

  const currentRoom = room;
  const mine = currentRoom.participants.find((participant) => participant.id === currentRoom.me.id);
  const ready = currentRoom.participants.length === 2
    && currentRoom.participants.every((participant) => participant.is_ready && participant.connection_status === "connected");

  async function setReady() {
    await fetch(`/api/rooms/${currentRoom.id}/ready`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ready: !mine?.is_ready })
    });
    await load();
  }

  async function start() {
    const response = await fetch(`/api/rooms/${currentRoom.id}/start`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error.message);
      return;
    }
    router.push(`/room/${code}/capture?session=${body.data.session_id}`);
  }

  async function leave() {
    await fetch(`/api/rooms/${currentRoom.id}/leave`, { method: "POST" });
    router.push("/");
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return <div className="room-page">
    <section className="room-heading">
      <div>
        <div className="eyebrow">Waiting room</div>
        <h1>Siap untuk berpose?</h1>
        <p className="muted">Pastikan kamera terlihat jelas dan tunggu pasanganmu bergabung.</p>
      </div>
      <div className="room-heading-actions">
        <button className="room-code" onClick={copyCode} aria-label="Salin room code">
          <span>Room code</span>
          <strong>{code}</strong>
          <Copy size={16} />
          {copied && <em>Disalin</em>}
        </button>
        <button className="btn btn-secondary" onClick={leave}><LogOut size={17} />Keluar</button>
      </div>
    </section>

    <section className="glass room-stage">
      {token && livekitUrl
        ? <LiveKitRoom
            token={token}
            serverUrl={livekitUrl}
            connect
            audio={false}
            video
            data-lk-theme="default"
            className="photobox-livekit"
            onError={() => setError("LIVEKIT_CONNECTION_FAILED: Periksa izin dan koneksi.")}
          >
            <RoomMedia />
            <RoomAudioRenderer />
          </LiveKitRoom>
        : <Loading label="Menyambungkan kamera aman…" />}
    </section>

    <section className="glass card room-footer">
      <div className="participant-list" aria-live="polite">
        <span className="participant-count"><Users size={16} />{currentRoom.participants.length}/2 peserta</span>
        {currentRoom.participants.map((participant) => <span className="status" key={participant.id}>
          <span className="dot" style={{ background: participant.connection_status === "connected" ? "var(--success)" : "var(--warning)" }} />
          <strong>{participant.display_name}</strong>
          <span>{participant.is_ready ? "Siap" : "Belum siap"}</span>
        </span>)}
      </div>
      <div className="room-actions">
        <button className={`btn ${mine?.is_ready ? "btn-secondary" : "btn-primary"}`} onClick={setReady}>
          <Check size={17} />{mine?.is_ready ? "Batalkan siap" : "Saya siap"}
        </button>
        {currentRoom.me.role === "host" && <button className="btn btn-primary" disabled={!ready} onClick={start}>
          <Radio size={17} />Mulai Photobox
        </button>}
      </div>
    </section>
  </div>;
}
