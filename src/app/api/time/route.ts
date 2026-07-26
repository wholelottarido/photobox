import {ok} from "@/lib/api";export const dynamic="force-dynamic";export function GET(){return ok({now:new Date().toISOString(),epochMs:Date.now()});}
