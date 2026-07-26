import {describe,expect,it} from "vitest";import {captureDelay,serverOffset} from "@/lib/capture/schedule";
describe("server synchronized capture",()=>{it("accounts for half round-trip latency",()=>{expect(serverOffset(1100,0,200)).toBe(1000);expect(captureDelay(2500,1000,1000)).toBe(500)});it("never returns negative delay",()=>expect(captureDelay(1,0,2)).toBe(0))});
