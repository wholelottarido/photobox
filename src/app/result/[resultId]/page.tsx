import {ResultView} from "@/components/result/result-view";import {SessionGate} from "@/components/auth/session-gate";
export const dynamic="force-dynamic";export default async function Page({params}:{params:Promise<{resultId:string}>}){const {resultId}=await params;return <main className="container" style={{padding:"45px 0"}}><SessionGate><ResultView resultId={resultId}/></SessionGate></main>}
