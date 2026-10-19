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
  </KnowledgeShell>;
}
