import { InviteCard } from "@/components/invitation/invite-card";import { SessionGate } from "@/components/auth/session-gate";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;return <main className="container" style={{maxWidth:680,padding:"70px 0"}}><SessionGate><InviteCard token={token}/></SessionGate></main>}
