export function rawPhotoPath(roomId:string,sessionId:string,participantId:string,shot:number,ext:"webp"|"jpg"="webp"){
  const safe=[roomId,sessionId,participantId].every(v=>/^[0-9a-f-]{36}$/i.test(v)); if(!safe||shot<1||shot>8) throw new Error("Invalid storage path input");
  return `${roomId}/${sessionId}/${participantId}/${shot}.${ext}`;
}
