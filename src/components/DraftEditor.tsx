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
 const [source,setSource]=useState(""),[item,setItem]=useState<Stored|null>(null),[recipe,setRecipe]=useState<Recipe|null>(null),[raw,setRaw]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[info,setInfo]=useState("");
 useEffect(()=>{let cancelled=false;(async()=>{try{const res=await fetch("/api/drafts/"+encodeURIComponent(id),{cache:"no-store"});const d=await res.json();if(!res.ok)throw Error(d.error||"Betöltés sikertelen.");if(!cancelled){setItem(d.item);setRecipe(parseRecipe(d.item.body,d.item.title,d.item.category));setRaw(JSON.stringify(d.item.body,null,2));setSource(typeof d.item.body?.sourceText==="string"?d.item.body.sourceText:"")}}catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Betöltési hiba")}})();return()=>{cancelled=true}},[id]);
 const setField=(key:"title"|"category",value:string)=>setRecipe(p=>p?{...p,[key]:value}:p);
 const setIng=(index:number,key:keyof Ingredient,value:string)=>setRecipe(p=>p?{...p,ingredients:p.ingredients.map((x,i)=>i===index?{...x,[key]:value}:x)}:p);
 const updateStep=(index:number,value:string)=>setRecipe(p=>p?{...p,steps:p.steps.map((x,i)=>i===index?value:x)}:p);
 async function regenerate(){if(source.trim().length<15)return;setBusy(true);setError("");setInfo("");try{const r=await fetch("/api/gemini",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:item?.kind==="math"?"math":"recipe",text:source})});const d=await r.json();if(!r.ok)throw Error(d.error||"Nem sikerült feldolgozni.");setRecipe(parseRecipe(d.suggestion,recipe?.title||"",recipe?.category||""));setInfo("Gemini-javaslat visszaállítva a forrásból. Ellenőrizd az adatokat, majd külön mentsd el.")}catch(e){setError(e instanceof Error?e.message:"Gemini hiba")}finally{setBusy(false)}}
 async function save(){if(!item||!recipe)return;setBusy(true);setError("");setInfo("");try{
 const body=item.kind==="recipe"?{...(item.body&&typeof item.body==="object"?item.body as Record<string,unknown>:{}),...recipe,sourceText:source,ingredients:recipe.ingredients.map(x=>({...x,unit:x.unit==="teáskanál"?"tk":x.unit==="evőkanál"?"ek":x.unit==="kávéskanál"?"kk":x.unit}))}:JSON.parse(raw);
 const r=await fetch("/api/drafts/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:recipe.title,category:recipe.category,body,sourceUrl:item.source_url||""})});
 const d=await r.json();if(!r.ok)throw Error(d.error||"Mentés sikertelen.");setInfo("Mentve a felhőbe, "+d.version+". verzióként. Továbbra is piszkozat.");onSaved();
 }catch(e){setError(e instanceof Error?e.message:"Mentési hiba")}finally{setBusy(false)}}
 if(!item)return <div className="note">{error||"Piszkozat megnyitása..."}</div>;
 return <section className="card" style={{borderColor:"#a9c4f4",marginTop:16}}>
 <div className="row between"><h3>Szerkeszthető piszkozat · v{item.version_number}</h3><button className="btn ghost" onClick={onClose}>Bezárás ×</button></div>
 <p className="muted text-sm">Az új mentés külön verzióként megőrzi a korábbi állapotot.</p>
 <label className="field">Cím<input className="input" value={recipe?.title||""} onChange={e=>setField("title",e.target.value)}/></label>
 {item.kind==="recipe"&&recipe?<><label className="field">Kategória<input className="input" value={recipe.category} onChange={e=>setField("category",e.target.value)}/></label>
 {source&&<div className="note"><strong>Az eredetileg elmentett receptszöveg:</strong><textarea className="input" rows={10} style={{marginTop:10}} value={source} onChange={e=>setSource(e.target.value)}/><p className="muted text-sm">Ez a teljes kinyert szöveg. A korábbi mentésből visszaállítottuk; most látható és szerkeszthető. A hozzávalók és lépések strukturálásához használd az alábbi gombot.</p><button className="btn soft" disabled={busy||source.trim().length<15} onClick={()=>void regenerate()}>✦ Gemini: receptlap előállítása ebből a szövegből</button></div>}<h4>Hozzávalók</h4>{recipe.ingredients.map((ing,i)=><div className="row" key={i} style={{marginBottom:8}}><input className="input" style={{flex:2,minWidth:130}} aria-label={"Hozzávaló "+(i+1)} value={ing.name} onChange={e=>setIng(i,"name",e.target.value)}/><input className="input" style={{flex:1,minWidth:70}} aria-label="Mennyiség" value={ing.amount} onChange={e=>setIng(i,"amount",e.target.value)}/><input className="input" style={{flex:1,minWidth:65}} aria-label="Egység" value={ing.unit} onChange={e=>setIng(i,"unit",e.target.value)}/><button className="btn ghost" onClick={()=>setRecipe(p=>p?{...p,ingredients:p.ingredients.filter((_,j)=>i!==j)}:p)}>×</button></div>)}
 <button className="btn soft" onClick={()=>setRecipe(p=>p?{...p,ingredients:[...p.ingredients,{name:"",amount:"",unit:"g"}]}:p)}>+ Hozzávaló</button>
 <h4>Elkészítés</h4>{recipe.steps.map((s,i)=><label className="field" key={i}>Lépés {i+1}<textarea className="input" rows={2} value={s} onChange={e=>updateStep(i,e.target.value)}/><button className="btn ghost" onClick={()=>setRecipe(p=>p?{...p,steps:p.steps.filter((_,j)=>i!==j)}:p)}>Lépés törlése</button></label>)}
 <button className="btn soft" onClick={()=>setRecipe(p=>p?{...p,steps:[...p.steps,""]}:p)}>+ Elkészítési lépés</button>
 <h4>Hiányzó vagy bizonytalan adatok</h4>{recipe.uncertainties.map((u,i)=><label className="field" key={i}>Megjegyzés {i+1}<input className="input" value={u} onChange={e=>setRecipe(p=>p?{...p,uncertainties:p.uncertainties.map((x,j)=>i===j?e.target.value:x)}:p)}/></label>)}
 <button className="btn soft" onClick={()=>setRecipe(p=>p?{...p,uncertainties:[...p.uncertainties,""]}:p)}>+ Hiányzó adat</button>
 </>:<label className="field">Tananyag JSON<textarea className="input" rows={12} value={raw} onChange={e=>setRaw(e.target.value)}/></label>}
 <div className="row" style={{marginTop:18}}><button className="btn" disabled={busy||!recipe?.title.trim()} onClick={()=>void save()}>{busy?"Mentés...":"Módosítás mentése új verzióként"}</button><span className="tag">Nem kerül automatikusan közzétételre</span></div>
 {error&&<p className="note warn" role="alert">{error}</p>}{info&&<p className="note ok" role="status">{info}</p>}
 </section>
}
