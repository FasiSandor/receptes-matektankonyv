"use client";
import {useEffect,useState} from "react";
type Ingredient={name:string;amount:string;unit:string};
type Recipe={title:string;category:string;ingredients:Ingredient[];steps:string[];uncertainties:string[]};
type Stored={id:string;title:string;kind:string;category:string|null;body:unknown;source_url:string|null;version_number:number};
function parseRecipe(body:unknown,title:string,category:string|null):Recipe{
 const b=body&&typeof body==="object"?body as Record<string,unknown>:{};
 const list=Array.isArray(b.ingredients)?b.ingredients:[];
 return {title:typeof b.title==="string"?b.title:title,category:typeof b.category==="string"?b.category:(category||""),
 ingredients:list.map((x:unknown)=>{const a=x&&typeof x==="object"?x as Record<string,unknown>:{};return {name:String(a.name??""),amount:String(a.amount??""),unit:String(a.unit??"")}}),
 steps:Array.isArray(b.steps)?b.steps.map(String):[],uncertainties:Array.isArray(b.uncertainties)?b.uncertainties.map(String):[]};
}
export default function DraftEditor({id,onClose,onSaved}:{id:string;onClose:()=>void;onSaved:()=>void}){
 const [editingMode,setEditingMode]=useState(false),[source,setSource]=useState(""),[item,setItem]=useState<Stored|null>(null),[recipe,setRecipe]=useState<Recipe|null>(null),[raw,setRaw]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[info,setInfo]=useState("");
 useEffect(()=>{let cancelled=false;(async()=>{try{const res=await fetch("/api/drafts/"+encodeURIComponent(id),{cache:"no-store"});const d=await res.json();if(!res.ok)throw Error(d.error||"Betöltés sikertelen.");if(!cancelled){setItem(d.item);setRecipe(parseRecipe(d.item.body,d.item.title,d.item.category));setRaw(JSON.stringify(d.item.body,null,2));setSource(typeof d.item.body?.sourceText==="string"?d.item.body.sourceText:"")}}catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Betöltési hiba")}})();return()=>{cancelled=true}},[id]);
 const setField=(key:"title"|"category",value:string)=>setRecipe(p=>p?{...p,[key]:value}:p);
 const setIng=(index:number,key:keyof Ingredient,value:string)=>setRecipe(p=>p?{...p,ingredients:p.ingredients.map((x,i)=>i===index?{...x,[key]:value}:x)}:p);
 const updateStep=(index:number,value:string)=>setRecipe(p=>p?{...p,steps:p.steps.map((x,i)=>i===index?value:x)}:p);
 async function regenerate(){if(source.trim().length<15)return;setBusy(true);setError("");setInfo("");try{const r=await fetch("/api/gemini",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:item?.kind==="math"?"math":"recipe",text:source.slice(0,12000)})});const d=await r.json();if(!r.ok)throw Error(d.error||"Nem sikerült feldolgozni.");if(!d.suggestion||!Array.isArray(d.suggestion.ingredients)||!Array.isArray(d.suggestion.steps))throw Error("A Gemini válasza hiányos.");setRecipe(parseRecipe(d.suggestion,recipe?.title||"",recipe?.category||""));setEditingMode(false);setInfo("Magyar receptlap elkészült. Ellenőrizd, majd mentsd el a gombbal.")}catch(e){setError(e instanceof Error?e.message:"Gemini hiba")}finally{setBusy(false)}}
 async function save(){if(!item||!recipe)return;setBusy(true);setError("");setInfo("");try{
 const body=item.kind==="recipe"?{...(item.body&&typeof item.body==="object"?item.body as Record<string,unknown>:{}),...recipe,sourceText:source,ingredients:recipe.ingredients.map(x=>({...x,unit:x.unit==="teáskanál"?"tk":x.unit==="evőkanál"?"ek":x.unit==="kávéskanál"?"kk":x.unit}))}:JSON.parse(raw);
 const r=await fetch("/api/drafts/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:recipe.title,category:recipe.category,body,sourceUrl:item.source_url||""})});
 const d=await r.json();if(!r.ok)throw Error(d.error||"Mentés sikertelen.");setInfo("Mentve a felhőbe, "+d.version+". verzióként. Továbbra is piszkozat.");setEditingMode(false);onSaved();
 }catch(e){setError(e instanceof Error?e.message:"Mentési hiba")}finally{setBusy(false)}}
 if(!item)return <div className="note">{error||"Piszkozat megnyitása..."}</div>;
 return <section className="card" style={{borderColor:"#a9c4f4",marginTop:16}}>
 <div className="row between"><h3>Szerkeszthető piszkozat · v{item.version_number}</h3><button className="btn ghost" onClick={onClose}>Bezárás ×</button></div>
 <p className="muted text-sm">Az új mentés külön verzióként megőrzi a korábbi állapotot.</p>{item.source_url&&<p className="note"><strong>Eredeti forrás:</strong> <a href={item.source_url} target="_blank" rel="noopener noreferrer">Forráslink megnyitása ↗</a><br/><span className="muted text-sm">Facebook esetén a videó és a receptszöveg automatikus kinyerése nem garantált.</span></p>}

 {item.kind==="recipe"&&recipe?<div className="stack">
 {!editingMode?<div className="stack">
 <div className="row between"><div><div className="kicker">MAGYAR RECEPTLAP</div><h2 style={{marginBottom:4}}>{recipe.title}</h2><span className="tag">{recipe.category||"Besorolatlan"}</span></div><button className="btn soft" onClick={()=>setEditingMode(true)}>✎ Szerkesztés</button></div>
 {recipe.ingredients.length>0&&<div className="subtle"><h3>Hozzávalók</h3>{recipe.ingredients.map((ing,i)=><div key={i} className="row between" style={{borderBottom:"1px solid #e4eaf2",padding:"11px 0",alignItems:"baseline"}}><span>{ing.name}</span><strong className="amount">{ing.amount} {ing.unit}</strong></div>)}</div>}
 {recipe.steps.length>0&&<div className="subtle"><h3>Elkészítés</h3><ol style={{paddingLeft:24,lineHeight:1.7}}>{recipe.steps.map((step,i)=><li key={i} style={{marginBottom:15,paddingLeft:5}}>{step}</li>)}</ol></div>}
 {recipe.uncertainties.length>0&&<div className="note warn"><strong>Hiányzó vagy bizonytalan adatok</strong><ul>{recipe.uncertainties.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
 {recipe.ingredients.length===0&&recipe.steps.length===0&&<p className="note warn">Ez a mentés csak forrásszöveget tartalmaz, még nincs belőle kész receptlap.</p>}
 {source&&<details className="note"><summary style={{cursor:"pointer",fontWeight:700}}>Eredeti forrásszöveg és újrafeldolgozás</summary><textarea className="input" rows={6} style={{marginTop:12}} value={source} onChange={e=>setSource(e.target.value)}/><button style={{marginTop:12}} className="btn soft" disabled={busy||source.trim().length<15} onClick={()=>void regenerate()}>✦ Gemini: magyar receptlap készítése</button></details>}
 <div className="row"><button className="btn" disabled={busy||recipe.ingredients.length===0||recipe.steps.length===0} onClick={()=>void save()}>{busy?"Mentés...":"Receptlap mentése"}</button><span className="tag">Piszkozat</span></div>
 </div>:<div className="stack">
 <div className="row between"><h3>Recept szerkesztése</h3><button className="btn ghost" onClick={()=>setEditingMode(false)}>Vissza az olvasó nézethez</button></div>
 <label className="field">Cím<input className="input" value={recipe.title} onChange={e=>setField("title",e.target.value)}/></label>
 <label className="field">Kategória<input className="input" value={recipe.category} onChange={e=>setField("category",e.target.value)}/></label>
 <h3>Hozzávalók</h3>
 {recipe.ingredients.map((ing,i)=><div key={i} style={{border:"1px solid #e0e8f2",borderRadius:12,padding:12,display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(72px,100px)",gap:9}}>
 <label style={{gridColumn:"1 / -1"}} className="field">Hozzávaló<input className="input" value={ing.name} onChange={e=>setIng(i,"name",e.target.value)}/></label>
 <label className="field">Mennyiség<input className="input" value={ing.amount} onChange={e=>setIng(i,"amount",e.target.value)}/></label>
 <label className="field">Egység<input className="input" value={ing.unit} onChange={e=>setIng(i,"unit",e.target.value)}/></label>
 <div style={{gridColumn:"1 / -1",textAlign:"right"}}><button className="btn ghost" onClick={()=>setRecipe(p=>p?{...p,ingredients:p.ingredients.filter((_,j)=>i!==j)}:p)}>Hozzávaló eltávolítása</button></div></div>)}
 <button className="btn soft" onClick={()=>setRecipe(p=>p?{...p,ingredients:[...p.ingredients,{name:"",amount:"",unit:"g"}]}:p)}>+ Hozzávaló</button>
 <h3>Elkészítés</h3>
 {recipe.steps.map((step,i)=><div key={i} className="field"><label>Lépés {i+1}</label><textarea className="input" style={{minHeight:110,resize:"vertical"}} rows={4} value={step} onChange={e=>updateStep(i,e.target.value)}/><div style={{textAlign:"right"}}><button className="btn ghost" onClick={()=>setRecipe(p=>p?{...p,steps:p.steps.filter((_,j)=>i!==j)}:p)}>Lépés eltávolítása</button></div></div>)}
 <button className="btn soft" onClick={()=>setRecipe(p=>p?{...p,steps:[...p.steps,""]}:p)}>+ Lépés</button>
 <h3>Megjegyzések</h3>{recipe.uncertainties.map((x,i)=><input className="input" key={i} value={x} onChange={e=>setRecipe(p=>p?{...p,uncertainties:p.uncertainties.map((v,j)=>i===j?e.target.value:v)}:p)}/>)}
 <button className="btn" disabled={busy||!recipe.title.trim()} onClick={()=>void save()}>{busy?"Mentés...":"Módosítás mentése"}</button>
 </div>}
 </div>:<div className="stack"><label className="field">Tananyag címe<input className="input" value={recipe?.title||""} onChange={e=>setField("title",e.target.value)}/></label><textarea className="input" rows={10} value={raw} onChange={e=>setRaw(e.target.value)}/><button className="btn" onClick={()=>void save()} disabled={busy}>Mentés</button></div>}
 {error&&<p className="note warn" role="alert">{error}</p>}{info&&<p className="note ok" role="status">{info}</p>}
 </section>
}
