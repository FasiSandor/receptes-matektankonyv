"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {listLibraryItems,saveLibraryResult,updateLibraryItem,createLibraryVideoUrl,type LibraryItem} from "../mota-import/library";

type Subject="matematika"|"gasztronomia";
const subjectTag=(x:Subject)=>"tantargy:"+x;
function platformOf(input:string){
 try {const u=new URL(input);if(u.protocol!=="https:"||u.username||u.password||u.port)return "";const h=u.hostname.toLowerCase();if(h==="youtu.be"||h.endsWith(".youtube.com")||h==="youtube.com")return "youtube";if(h==="facebook.com"||h.endsWith(".facebook.com")||h==="fb.watch")return "facebook";if(h==="tiktok.com"||h.endsWith(".tiktok.com"))return "tiktok";if(h==="instagram.com"||h.endsWith(".instagram.com"))return "instagram";}catch{}return "";
}
function thumbOf(input:string){
 try{const u=new URL(input);const h=u.hostname.toLowerCase();let id="";
 if(h==="youtu.be")id=u.pathname.split("/")[1]||"";
 if(h==="youtube.com"||h.endsWith(".youtube.com"))id=u.searchParams.get("v")||u.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1]||"";
 if(/^[\w-]{11}$/.test(id))return "https://i.ytimg.com/vi/"+id+"/hqdefault.jpg";
 }catch{}return "";
}
function hasSubject(item:LibraryItem,subject:Subject){
 const tags=item.tags||[];
 return tags.includes(subjectTag(subject)) || (subject==="gasztronomia"&&!tags.some(t=>t.startsWith("tantargy:")));
}
function metadata(item:LibraryItem,prefix:string){return item.tags?.find(x=>x.startsWith(prefix))?.slice(prefix.length)||"";}
const colors={bg:"#0b0f14",card:"#172033",border:"#2a3445",blue:"#60a5fa",muted:"#9ca3af"};
const field:React.CSSProperties={width:"100%",boxSizing:"border-box",background:"#111827",border:"1px solid #334155",borderRadius:10,padding:"12px 13px",color:"white",fontSize:15};
const btn:React.CSSProperties={background:"#3b82f6",color:"white",border:"none",borderRadius:10,padding:"12px 16px",fontWeight:700,cursor:"pointer"};
export default function SharedVideoLibrary(){
 const [subject,setSubject]=useState<Subject>("matematika");
 const [items,setItems]=useState<LibraryItem[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [msg,setMsg]=useState("");
 const [url,setUrl]=useState("");
 const [title,setTitle]=useState("");
 const [grade,setGrade]=useState("9");
 const [topic,setTopic]=useState("");
 const [search,setSearch]=useState("");
 const [onlyFiles,setOnlyFiles]=useState(false);
 const [playUrl,setPlayUrl]=useState("");
 const [brokenCovers,setBrokenCovers]=useState<string[]>([]);
 useEffect(()=>{void (async()=>{try{setItems(await listLibraryItems())}catch(e){setMsg(e instanceof Error?e.message:"A gyűjtemény nem tölthető be.")}finally{setLoading(false)}})()},[]);
 const shown=useMemo(()=>items.filter(x=>hasSubject(x,subject)&&(!onlyFiles||!!x.video_path)&&(!search||[x.title,x.source_url,metadata(x,"tema:"),metadata(x,"evfolyam:")].join(" ").toLocaleLowerCase("hu").includes(search.toLocaleLowerCase("hu")))),[items,subject,search,onlyFiles]);
 async function save(){
  if(saving)return;
  const source=url.trim();const platform=platformOf(source);
  if(!platform){setMsg("Facebook, Instagram, TikTok vagy YouTube videólinket adj meg.");return;}
  if(!title.trim()){setMsg("Adj egy címet a videónak.");return;}
  setSaving(true);setMsg("");
  try{
   const existing=items.find(x=>x.source_url===source);
   const tags=[...(existing?.tags||[])];
   const add=(t:string)=>{if(t&&!tags.includes(t))tags.push(t)};
   add(subjectTag(subject));
   if(subject==="matematika"){add("evfolyam:"+grade);if(topic.trim())add("tema:"+topic.trim().slice(0,90))}
   if(existing){const updated=await updateLibraryItem(existing.id,{tags});setItems(xs=>xs.map(x=>x.id===updated.id?updated:x));setMsg("A videót hozzárendeltem a tantárgyhoz. A meglévő feldolgozás megmaradt.");}
   else{
    const item=await saveLibraryResult({title:title.trim(),source_url:source,platform,thumbnail_url:thumbOf(source),recipe_group:subject==="matematika"?"Matematikai kiegészítő":"Egyéb",hungarian_summary:"Videóforrás mentve. A tényleges videófájl csak sikeres letöltés esetén áll rendelkezésre.",tags});
    setItems(xs=>[item,...xs.filter(x=>x.id!==item.id)]);setMsg("Videólink elmentve. Ez még nem jelenti a videófájl letöltését.");
   }
   setUrl("");setTitle("");
  }catch(e){setMsg(e instanceof Error?e.message:"A mentés nem sikerült.")}
  finally{setSaving(false)}
 }
 async function play(item:LibraryItem){
  if(!item.video_path){window.open(item.source_url,"_blank","noopener,noreferrer");return;}
  const signed=await createLibraryVideoUrl(item.video_path);
  if(signed)setPlayUrl(signed);else{setMsg("A tárolt videó nem érhető el. Az eredeti forrást megnyithatod.");window.open(item.source_url,"_blank","noopener,noreferrer")}
 }
 return <main className="kh-video-workspace" style={{background:colors.bg,color:"#f8fafc",minHeight:"100vh",padding:"22px 16px 60px",fontFamily:"system-ui,-apple-system,sans-serif"}}>
 <div style={{maxWidth:1000,margin:"0 auto"}}>
 <Link href="/" style={{color:colors.blue,fontWeight:700,textDecoration:"none"}}>← Receptes és Matektankönyv</Link>
 <header style={{margin:"22px 0"}}><div style={{color:"#22d3ee",fontSize:12,fontWeight:800,letterSpacing:2}}>KÖZÖS MÉDIATÁR</div><h1 style={{fontSize:"clamp(27px,5vw,40px)",margin:"8px 0"}}>Videókönyvtár</h1><p style={{color:colors.muted,lineHeight:1.55}}>Gasztronómiai és matematikai videók egy helyen. A matekos videók önálló tananyag-kiegészítők is lehetnek, nem kell tanmenethez kapcsolni őket.</p></header>
 <div style={{display:"flex",gap:8,marginBottom:18}}>
 {([["matematika","∑ Matematika"],["gasztronomia","♨ Gasztronómia"]] as const).map(([id,label])=><button key={id} type="button" onClick={()=>{setSubject(id);setMsg("")}} style={{...btn,flex:1,background:subject===id?"#2563eb":"#172033",border:subject===id?"1px solid #60a5fa":"1px solid #334155"}}>{label}</button>)}
 </div>
 <section style={{background:colors.card,padding:18,borderRadius:16,border:"1px solid "+colors.border,marginBottom:22}}>
 <h2 style={{fontSize:19,margin:"0 0 6px"}}>+ Videó hozzáadása</h2><p style={{color:colors.muted,fontSize:13,margin:"0 0 16px"}}>YouTube, Facebook, TikTok vagy Instagram link. Az eredeti forrás megmarad, a ténylegesen letöltött fájlt külön jelöljük.</p>
 <div style={{display:"grid",gap:10}}>
 <input style={field} value={url} onChange={e=>setUrl(e.target.value)} placeholder="Videó URL: https://..." aria-label="Videó URL"/>
 <input style={field} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Mi a videó témája vagy címe?" aria-label="Videó címe"/>
 {subject==="matematika"&&<div style={{display:"grid",gridTemplateColumns:"110px 1fr",gap:10}}><select style={field} value={grade} onChange={e=>setGrade(e.target.value)} aria-label="Évfolyam">{["9","10","11","12","13","Egyéb"].map(x=><option key={x} value={x}>{x==="Egyéb"?x:x+". oszt."}</option>)}</select><input style={field} value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Témakör (pl. másodfokú egyenletek)" aria-label="Témakör"/></div>}
 <button style={btn} disabled={saving} onClick={()=>void save()}>{saving?"Mentés…":"Mentés a közös videótárba"}</button>
 </div></section>
 {msg&&<p role="status" style={{padding:12,borderRadius:10,background:"#111827",color:"#c4e6ff"}}>{msg}</p>}
 <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
 <h2 style={{fontSize:20,margin:"0 auto 0 0"}}>{subject==="matematika"?"Matematikai videók":"Gasztronómiai videók"} ({shown.length})</h2>
 <input style={{...field,width:"min(260px,100%)"}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Keresés címre, témára…" aria-label="Videó keresése"/>
 <label style={{fontSize:13,whiteSpace:"nowrap"}}><input type="checkbox" checked={onlyFiles} onChange={e=>setOnlyFiles(e.target.checked)}/> Csak mentett videófájlok</label>
 </div>
 {loading?<p>Gyűjtemény betöltése…</p>:shown.length===0?<p style={{color:colors.muted}}>Ebben a szűrésben még nincs videó.</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:14}}>
 {shown.map(item=><article key={item.id} style={{border:"1px solid "+colors.border,background:colors.card,borderRadius:14,overflow:"hidden"}}>
 <div style={{height:160,background:"#111827",position:"relative",display:"grid",placeItems:"center"}}>
 {(!brokenCovers.includes(item.id)&&(item.thumbnail_url||thumbOf(item.source_url)))?<img src={item.thumbnail_url||thumbOf(item.source_url)} alt="" style={{height:"100%",width:"100%",objectFit:"cover"}} onError={()=>setBrokenCovers(xs=>[...xs,item.id])}/>:<span style={{fontSize:38,color:"#60a5fa"}}>▶</span>}
 <span style={{position:"absolute",bottom:8,left:8,background:item.video_path?"#166534":"#1f2937",color:"white",fontSize:11,padding:"5px 8px",borderRadius:7}}>{item.video_path?"✓ Videófájl tárolva":"Csak forráshivatkozás"}</span>
 </div>
 <div style={{padding:14}}><strong style={{display:"block",lineHeight:1.35,marginBottom:6}}>{item.title}</strong><div style={{color:colors.muted,fontSize:12,marginBottom:10}}>{item.platform}{metadata(item,"evfolyam:")?" · "+metadata(item,"evfolyam:")+". évf.":""}{metadata(item,"tema:")?" · "+metadata(item,"tema:"):""}</div>
 <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={{...btn,padding:"9px 12px",fontSize:12}} onClick={()=>void play(item)}>{item.video_path?"▶ Mentett videó":"↗ Forrás megnyitása"}</button><Link href={`/mota-import?url=${encodeURIComponent(item.source_url)}`} style={{...btn,padding:"9px 12px",fontSize:12,textDecoration:"none",background:"#24344f"}}>Elemzés →</Link></div>
 </div></article>)}</div>}
 {playUrl&&<div role="dialog" aria-label="Mentett videó" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:50,display:"grid",placeItems:"center",padding:16}}><div style={{width:"min(96vw,800px)"}}><button style={{...btn,marginBottom:10}} onClick={()=>setPlayUrl("")}>Bezárás ×</button><video src={playUrl} controls autoPlay playsInline style={{width:"100%",maxHeight:"75vh"}}/></div></div>}
 <p style={{color:colors.muted,marginTop:26,fontSize:12}}>Megjegyzés: a videó elmentett hivatkozása nem bizonyítja, hogy maga a fájl letöltődött. A nem hozzáférhető Facebook-videók automatikus letöltése továbbra is korlátozott.</p>
 </div></main>;
}
