export function PhotoStrip({ compact = false }: { compact?: boolean }) {
  return <div aria-label="Preview strip photobox" style={{width:compact?176:230,background:"#ffe7ee",borderRadius:18,padding:12,boxShadow:"0 28px 70px rgba(0,0,0,.35)",transform:"rotate(2deg)"}}>
    {[0,1,2,3].map((n)=><div key={n} style={{height:compact?67:90,marginBottom:8,borderRadius:8,overflow:"hidden",background:`linear-gradient(${135+n*25}deg,#241d3f,#d76e98 58%,#ffcedc)`}}>
      <div style={{width:36,height:36,borderRadius:99,background:"rgba(255,255,255,.2)",margin:"14px auto"}}/>
    </div>)}
    <div style={{textAlign:"center",color:"#391626",fontWeight:950,fontSize:compact?12:15,padding:"5px 0 2px"}}>TOGETHER, ANYWHERE ♥</div>
  </div>;
}
