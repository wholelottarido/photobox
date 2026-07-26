import {describe,expect,it} from "vitest";import {generateRoomCode} from "@/lib/rooms/code";
describe("generateRoomCode",()=>{it("creates six unambiguous uppercase characters",()=>{for(let i=0;i<100;i++)expect(generateRoomCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)});it("is not constant",()=>{expect(new Set(Array.from({length:20},()=>generateRoomCode())).size).toBeGreaterThan(18)})});
