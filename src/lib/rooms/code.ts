import { randomInt } from "node:crypto";
const ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateRoomCode(length=6){return Array.from({length},()=>ALPHABET[randomInt(ALPHABET.length)]).join("");}
