import {ImageResponse} from "next/og";
export function renderKnowledgeIcon(size:number){
 const scale=size/512;
 return new ImageResponse(
 <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(140deg,#123c69 0%,#071629 51%,#020713 100%)",position:"relative",overflow:"hidden"}}>
 <div style={{position:"absolute",inset:20*scale,borderRadius:96*scale,border:"6px solid #078cfa",display:"flex",boxShadow:"inset 0 0 48px #087eff2b"}}/>
 <div style={{position:"absolute",top:112*scale,left:124*scale,width:264*scale,height:246*scale,borderRadius:65*scale,background:"#0378ed",filter:"blur(64px)",opacity:.6,display:"flex"}}/>
 <div style={{display:"flex",width:320*scale,height:205*scale,position:"relative",alignItems:"stretch",marginTop:42*scale}}>
 <div style={{flex:1,display:"flex",borderRadius:15*scale,border:"13px solid #59dfff",borderRight:"5px solid #59dfff",background:"#0b3d7b",transform:"skewY(8deg)",boxShadow:"0 0 17px #2fa8ff"}}/>
 <div style={{flex:1,display:"flex",borderRadius:15*scale,border:"13px solid #168cff",borderLeft:"5px solid #59dfff",background:"#0b3d7b",transform:"skewY(-8deg)",boxShadow:"0 0 17px #2fa8ff"}}/>
 <div style={{position:"absolute",left:153*scale,top:12*scale,width:14*scale,height:196*scale,background:"#95f2ff",borderRadius:9*scale,display:"flex"}}/>
 </div>
 <div style={{position:"absolute",top:108*scale,left:236*scale,width:40*scale,height:40*scale,borderRadius:"50%",background:"#79f4ff",boxShadow:"0 0 24px #24cdff",display:"flex"}}/>
 </div>,
 {width:size,height:size}
 );
}
