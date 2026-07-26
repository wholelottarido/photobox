import {describe,expect,it} from "vitest";import {rawPhotoPath} from "@/lib/storage/paths";
const id="550e8400-e29b-41d4-a716-446655440000";
describe("storage paths",()=>{it("uses server-owned hierarchy",()=>expect(rawPhotoPath(id,id,id,2)).toBe(`${id}/${id}/${id}/2.webp`));it("rejects traversal",()=>expect(()=>rawPhotoPath("../bad",id,id,1)).toThrow())});
