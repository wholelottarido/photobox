export function serverOffset(serverNow:number,requestStarted:number,responseReceived:number){return serverNow-(requestStarted+(responseReceived-requestStarted)/2);}
export function captureDelay(captureAt:number,offsetMs:number,clientNow=Date.now()){return Math.max(0,captureAt-(clientNow+offsetMs));}
