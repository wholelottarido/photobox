import {CaptureStudio} from "@/components/capture/capture-studio";import {SessionGate} from "@/components/auth/session-gate";
export const dynamic="force-dynamic";
export default async function Page({params,searchParams}:{params:Promise<{code:string}>;searchParams:Promise<{session?:string}>}){const [{code},{session}]=await Promise.all([params,searchParams]);return <main><SessionGate><CaptureStudio code={code} sessionId={session||""}/></SessionGate></main>}
