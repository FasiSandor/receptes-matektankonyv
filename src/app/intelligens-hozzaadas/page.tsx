"use client";
import { useEffect, useRef, useState } from "react";
import KnowledgeShell from "@/components/KnowledgeShell";
import { saveLibraryResult, type MotaResult } from "../mota-import/library";

function displayDuration(value:string):string {
 const match=/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(value);
 if(!match)return value;
 const units=[match[1]&&match[1]+" nap",match[2]&&match[2]+" óra",match[3]&&match[3]+" perc",match[4]&&match[4]+" másodperc"].filter(Boolean);
 return units.length?units.join(" "):value;
}

export default function IntelligentAdd() {
  const [url,setUrl]=useState("");
  const [title,setTitle]=useState("");
  const [summary,setSummary]=useState("");
  const [ingredients,setIngredients]=useState("");
  const [steps,setSteps]=useState("");
  const [author,setAuthor]=useState("");
  const [yieldText,setYieldText]=useState("");
  const [prepTime,setPrepTime]=useState("");
  const [cookTime,setCookTime]=useState("");
  const [image,setImage]=useState("");
  const [category,setCategory]=useState("");
  const [cuisine,setCuisine]=useState("");
  const [calories,setCalories]=useState("");
  const [keywords,setKeywords]=useState("");
  const [sourceKind,setSourceKind]=useState<"recipe"|"article"|"manual">("manual");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState(false);
  const [batchUrls,setBatchUrls]=useState("");
  const [batchResults,setBatchResults]=useState<Array<{url:string;title:string;description:string;ingredients:string[];steps:string[];kind:string;error?:string;selected:boolean}>>([]);
  const [batchBusy,setBatchBusy]=useState(false);
  const [batchProgress,setBatchProgress]=useState(0);
  const [batchMessage,setBatchMessage]=useState("");
  const batchAbort=useRef(false);
  async function analyzeBatch(){
    if(batchBusy)return;
    const urls=[...new Set(batchUrls.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean))];
    if(urls.length===0||urls.length>15){setBatchMessage("Adj meg 1–15 különálló forráslinket.");return;}
    setBatchBusy(true);batchAbort.current=false;setBatchResults([]);setBatchProgress(0);setBatchMessage("");
    const results:Array<{url:string;title:string;description:string;ingredients:string[];steps:string[];kind:string;error?:string;selected:boolean}>=[];
    try{
      for(const url of urls){
        if(batchAbort.current)break;
        try{
          const response=await fetch("/api/intelligens-hozzaadas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});
          const data=await response.json();
          if(!response.ok)throw Error(data.error||"A feldolgozás sikertelen.");
          results.push({url,title:String(data.title||""),description:String(data.description||""),ingredients:Array.isArray(data.ingredients)?data.ingredients:[],steps:Array.isArray(data.steps)&&data.steps.length?data.steps:Array.isArray(data.paragraphs)?data.paragraphs:[],kind:data.kind==="recipe"?"recipe":"article",selected:true});
        }catch(e){results.push({url,title:"",description:"",ingredients:[],steps:[],kind:"article",error:e instanceof Error?e.message:"Hiba",selected:false});}
        setBatchResults([...results]);setBatchProgress(results.length);
      }
    }finally{setBatchBusy(false);setBatchMessage(batchAbort.current?"A feldolgozás megszakítva. Az elkészült előnézetek megmaradtak.":"Feldolgozás kész. Ellenőrizd a találatokat mentés előtt.");}
  }
  async function saveBatch(){
    if(batchBusy)return;
    const chosen=batchResults.filter(x=>x.selected&&!x.error&&x.title.trim());
    if(!chosen.length){setBatchMessage("Nincs mentésre kijelölt, érvényes elem.");return;}
    if(!window.confirm(chosen.length+" kijelölt forrást mentünk a gyűjteménybe. Folytatod?"))return;
    setBatchBusy(true);batchAbort.current=false;setBatchProgress(0);
    let savedCount=0;let failedCount=0;
    try{
      for(const entry of chosen){
        if(batchAbort.current)break;
        try{
          const result:MotaResult={source_url:entry.url,title:entry.title.trim(),platform:"weboldal",hungarian_summary:entry.description,recipe_group:entry.kind==="recipe"?"Webes receptek":"Szakmai cikkek",ingredients:entry.ingredients.map(x=>({name:x,note:x})),method_steps:entry.steps,content_tags:["weboldal"]};
          await saveLibraryResult(result);
          savedCount++;
          setBatchResults(old=>old.map(x=>x.url===entry.url?{...x,selected:false}:x));
        }catch{failedCount++;}
        setBatchProgress(savedCount+failedCount);
      }
    }finally{setBatchBusy(false);setBatchMessage(savedCount+" mentve, "+failedCount+" sikertelen."+(batchAbort.current?" Megszakítva; a nem mentett elemek kijelölve maradtak.":""));}
  }
  const currentUrl=useRef("");
  const requestId=useRef(0);
  useEffect(()=>{const initial=new URLSearchParams(window.location.search).get("url")||"";currentUrl.current=initial;setUrl(initial)},[]);
  function changeSource(next:string) {
    currentUrl.current=next;
    requestId.current+=1;
    setUrl(next);
    setTitle("");setSummary("");setIngredients("");setSteps("");setAuthor("");setYieldText("");setPrepTime("");setCookTime("");setImage("");setSourceKind("manual");setCategory("");setCuisine("");setCalories("");setKeywords("");
    setSaved(false);setError("");setBusy(false);
  }
  const field:React.CSSProperties={width:"100%",padding:12,border:"1px solid #334155",borderRadius:10,background:"#111827",color:"#f8fafc",font:"inherit"};
  async function analyze() {
    setError("");setSaved(false);setBusy(true);
    const id=++requestId.current;
    const source=url.trim();
    try {
      const response=await fetch("/api/intelligens-hozzaadas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:source})});
      const result=await response.json();
      if(id!==requestId.current||source!==currentUrl.current.trim())return;
      if(!response.ok)throw Error(result.error||"Nem sikerült feldolgozni a weboldalt.");
      setTitle(result.title||"");setSummary(result.description||(result.paragraphs||[]).slice(0,3).join("\n"));
      setCategory(result.category||"");setCuisine(result.cuisine||"");setCalories(result.calories||"");setKeywords((result.keywords||[]).join(", "));
      setSourceKind(result.kind==="recipe"?"recipe":"article");
      setAuthor(result.author||"");setYieldText(result.recipeYield||"");setPrepTime(displayDuration(result.prepTime||""));setCookTime(displayDuration(result.cookTime||""));setImage(result.image||"");
      setIngredients((result.ingredients||[]).join("\n"));
      setSteps((result.steps?.length?result.steps:result.paragraphs||[]).join("\n"));
    }catch(e){if(id===requestId.current)setError(e instanceof Error?e.message:"Feldolgozási hiba. Kézzel is rögzítheted.");}
    finally{if(id===requestId.current)setBusy(false);}
  }
  async function save() {
    setError("");setSaved(false);
    let source:URL;
    try {source=new URL(url.trim());if(!["https:","http:"].includes(source.protocol)||source.username||source.password)throw Error();}
    catch {setError("Adj meg egy érvényes nyilvános HTTP(S) forráslinket.");return;}
    if(!title.trim()){setError("A cím megadása kötelező.");return;}
    setBusy(true);
    const saveId=requestId.current;
    try {
      const result:MotaResult={source_url:source.toString(),title:title.trim(),platform:"weboldal",hungarian_summary:[summary.trim(),author.trim()?"Szerző: "+author.trim():"",yieldText.trim()?"Adag: "+yieldText.trim():"",prepTime.trim()?"Előkészítési idő: "+prepTime.trim():"",cookTime.trim()?"Sütési/főzési idő: "+cookTime.trim():"",calories.trim()?"Kalória (forrás szerint): "+calories.trim():""].filter(Boolean).join("\n"),thumbnail_url:image.trim(),recipe_group:category.trim()|| (sourceKind==="recipe"?"Webes receptek":sourceKind==="article"?"Szakmai cikkek":ingredients.trim()?"Webes receptek":"Szakmai cikkek"),ingredient_tags:keywords.split(",").map(x=>x.trim()).filter(Boolean).slice(0,20),content_tags:[...new Set(["weboldal",...(cuisine.trim()?[cuisine.trim()]:[])])].slice(0,20),ingredients:ingredients.split("\n").map(line=>{const original=line.trim();const match=original.match(/^([\d]+(?:[.,][\d]+)?|[½¼¾])\s*(kg|dkg|g|mg|l|dl|cl|ml|db|csomag|cs|evőkanál|teáskanál|ek|tk|fej|gerezd|szál|szelet|csipet|pohár|bögre)(?=\s|$)\s*[-–:]?\s*(.*)$/i);return match&&match[3]?{name:match[3].trim(),amount:`${match[1]} ${match[2]}`,note:original}:{name:original,note:original};}).filter(x=>x.name),method_steps:steps.split("\n").map(s=>s.trim()).filter(Boolean)};
      await saveLibraryResult(result);if(saveId===requestId.current)setSaved(true);
    }catch(e){if(saveId===requestId.current)setError(e instanceof Error?e.message:"Nem sikerült a mentés.");}
    finally{if(saveId===requestId.current)setBusy(false);}
  }
  return <KnowledgeShell>
    <header className="kh-brand"><div className="kh-mark">✧</div><div><h1 className="kh-title">Intelligens hozzáadás</h1><p className="kh-sub">WEBOLDAL · RECEPT · CIKK</p></div></header>
    <section className="kh-card" style={{display:"grid",gap:12}}>
      <h2>Forrás rögzítése</h2>
      <p className="kh-muted">Nyilvános recept- és cikkoldalakból automatikusan kinyerjük az elérhető tartalmat. Mentés előtt ellenőrizd és javítsd az adatokat. Egyes oldalak tiltják az automatizált hozzáférést; ilyenkor kézzel is rögzítheted.</p>
      <label htmlFor="source">Eredeti webcím</label><input id="source" style={field} type="url" value={url} onChange={e=>changeSource(e.target.value)} placeholder="https://..."/>
      <button className="kh-btn secondary" disabled={busy} onClick={analyze}>{busy?"Feldolgozás…":"Weboldal feldolgozása"}</button><label htmlFor="title">Cím</label><input id="title" style={field} value={title} onChange={e=>setTitle(e.target.value)}/>
      <label htmlFor="summary">Összefoglaló</label><textarea id="summary" style={field} rows={3} value={summary} onChange={e=>setSummary(e.target.value)}/>
      {image&&<div style={{maxWidth:360}}><img src={image} alt="Forrásoldal receptképe" referrerPolicy="no-referrer" style={{width:"100%",maxHeight:240,objectFit:"contain",borderRadius:10}} onError={()=>setImage("")}/><p className="kh-muted">A kép a forrásoldalról töltődik be, nem kerül külön feltöltésre.</p></div>}
      <label htmlFor="author">Szerző / forrás</label><input id="author" style={field} value={author} onChange={e=>setAuthor(e.target.value)}/>
      <label htmlFor="yield">Adagszám / mennyiség</label><input id="yield" style={field} value={yieldText} onChange={e=>setYieldText(e.target.value)}/>
      <label htmlFor="prepTime">Előkészítési idő</label><input id="prepTime" style={field} value={prepTime} onChange={e=>setPrepTime(e.target.value)}/>
      <label htmlFor="cookTime">Elkészítési idő</label><input id="cookTime" style={field} value={cookTime} onChange={e=>setCookTime(e.target.value)}/>
      <label htmlFor="imageUrl">Receptkép webcíme (szerkeszthető)</label><input id="imageUrl" style={field} type="url" value={image} onChange={e=>setImage(e.target.value)}/>
      <label htmlFor="category">Receptkategória</label><input id="category" style={field} value={category} onChange={e=>setCategory(e.target.value)}/>
      <label htmlFor="cuisine">Konyha / nemzetiség</label><input id="cuisine" style={field} value={cuisine} onChange={e=>setCuisine(e.target.value)}/>
      <label htmlFor="calories">Kalória a forrás szerint</label><input id="calories" style={field} value={calories} onChange={e=>setCalories(e.target.value)}/>
      <label htmlFor="keywords">Kulcsszavak (vesszővel elválasztva)</label><input id="keywords" style={field} value={keywords} onChange={e=>setKeywords(e.target.value)}/>
      <label htmlFor="ingredients">Hozzávalók (soronként)</label><textarea id="ingredients" style={field} rows={5} value={ingredients} onChange={e=>setIngredients(e.target.value)}/>
      <label htmlFor="steps">Elkészítés vagy cikk tartalma (soronként)</label><textarea id="steps" style={field} rows={8} value={steps} onChange={e=>setSteps(e.target.value)}/>
      {error&&<p role="alert" style={{color:"#fca5a5"}}>{error}</p>}
      {saved&&<p role="status" style={{color:"#22c55e"}}>Mentve a gyűjteménybe.</p>}
      <button className="kh-btn" disabled={busy} onClick={save}>{busy?"Mentés…":"Mentés a gyűjteménybe"}</button>
      <a className="kh-btn secondary" href="/mota-import/gyujtemeny">Gyűjtemény megnyitása</a>
    </section>
    <section className="kh-card" style={{display:"grid",gap:12,marginTop:16}}>
      <h2>Több webcím feldolgozása</h2>
      <p className="kh-muted">Legfeljebb 15 recept- vagy cikklink soronként. Az eredményeket mentés előtt külön-külön ellenőrizheted, szerkesztheted és kijelölheted. Az eredeti egyedi hozzáadás változatlanul működik.</p>
      <label htmlFor="batchUrls">Forráslinkek, soronként egy</label>
      <textarea id="batchUrls" style={field} rows={6} value={batchUrls} disabled={batchBusy} onChange={e=>setBatchUrls(e.target.value)} placeholder={"https://pelda.hu/recept-1\\nhttps://pelda.hu/recept-2"}/>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button className="kh-btn secondary" disabled={batchBusy} onClick={analyzeBatch}>Linkek feldolgozása</button>
        <button className="kh-btn" disabled={batchBusy||!batchResults.some(x=>x.selected&&!x.error&&x.title.trim())} onClick={saveBatch}>Kijelöltek mentése</button>
        {batchBusy&&<button className="kh-btn secondary" onClick={()=>{batchAbort.current=true;setBatchMessage("Megszakítás kérve; a folyamatban lévő művelet még befejeződik.");}}>Megszakítás</button>}
      </div>
      {batchBusy&&<p role="status">Feldolgozott elemek: {batchProgress}</p>}
      {batchMessage&&<p role="status" className="kh-muted">{batchMessage}</p>}
      {batchResults.map((entry,index)=><div key={entry.url} style={{border:"1px solid #334155",borderRadius:10,padding:12,display:"grid",gap:8}}>
        <label><input type="checkbox" checked={entry.selected} disabled={batchBusy||!!entry.error} onChange={e=>setBatchResults(old=>old.map((x,i)=>i===index?{...x,selected:e.target.checked}:x))}/> {entry.error?"Sikertelen":entry.kind==="recipe"?"Recept":"Cikk"} – {index+1}.</label>
        <small style={{overflowWrap:"anywhere"}}>{entry.url}</small>
        {entry.error?<p role="alert">{entry.error}</p>:<>
          <label>Cím<input style={field} value={entry.title} disabled={batchBusy} onChange={e=>setBatchResults(old=>old.map((x,i)=>i===index?{...x,title:e.target.value}:x))}/></label>
          <label>Összefoglaló<textarea style={field} rows={2} value={entry.description} disabled={batchBusy} onChange={e=>setBatchResults(old=>old.map((x,i)=>i===index?{...x,description:e.target.value}:x))}/></label>
          <details><summary>Hozzávalók és tartalom szerkesztése</summary>
            <label>Hozzávalók<textarea style={field} rows={4} value={entry.ingredients.join("\\n")} disabled={batchBusy} onChange={e=>setBatchResults(old=>old.map((x,i)=>i===index?{...x,ingredients:e.target.value.split("\\n").filter(Boolean)}:x))}/></label>
            <label>Elkészítés / cikk<textarea style={field} rows={5} value={entry.steps.join("\\n")} disabled={batchBusy} onChange={e=>setBatchResults(old=>old.map((x,i)=>i===index?{...x,steps:e.target.value.split("\\n").filter(Boolean)}:x))}/></label>
          </details>
        </>}
      </div>)}
    </section>
  </KnowledgeShell>;
}
