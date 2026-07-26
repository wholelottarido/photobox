import {RoomLobby} from "@/components/room/room-lobby";import {SessionGate} from "@/components/auth/session-gate";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{code:string}>}){const {code}=await params;return <main className="container" style={{padding:"30px 0"}}><SessionGate><RoomLobby code={code.toUpperCase()}/></SessionGate></main>}
