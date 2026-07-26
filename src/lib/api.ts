import { NextResponse } from "next/server";
export function ok<T>(data:T,status=200){return NextResponse.json({success:true,data},{status});}
export function fail(code:string,message:string,status=400){return NextResponse.json({success:false,error:{code,message}},{status});}
export async function json(req:Request){if(!req.headers.get("content-type")?.includes("application/json")) throw new Error("UNSUPPORTED_MEDIA"); return req.json();}
export function safeError(error:unknown){console.error(error instanceof Error?error.message:"Unknown server error"); return fail("INTERNAL_ERROR","Terjadi kendala. Silakan coba lagi.",500);}
