import {NextResponse} from "next/server";
import {authenticated} from "@/lib/auth";
export const runtime="nodejs";
export const maxDuration=60;
const HOSTS=["facebook.com","fb.watch","instagram.com","tiktok.com","youtube.com","youtu.be"];
const GATEWAY="https://recept-ai-phi.vercel.app/api/mota-import/extract";
export async function POST(req:Request){
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
 let body:unknown;try{body=await req.json()}catch{return NextResponse.json({error:"Hibás kérés."},{status:400})}
 const url=body&&typeof body==="object"&&"url" in body?(body as {url:unknown}).url:null;
 if(typeof url!=="string"||url.length>2000)return NextResponse.json({error:"Videóhivatkozás szükséges."},{status:400});
 let parsed:URL;try{parsed=new URL(url)}catch{return NextResponse.json({error:"Érvénytelen link."},{status:400})}
 const hostname=parsed.hostname.toLowerCase();if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.port||!HOSTS.some(h=>hostname===h||hostname.endsWith("."+h)))return NextResponse.json({error:"Csak nyilvános Facebook, Instagram, TikTok és YouTube videólink fogadható el."},{status:400});
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),55000);
 try{
  const res=await fetch(GATEWAY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:parsed.toString(),focus:"all"}),signal:ctrl.signal,cache:"no-store"});
  const data=await res.json().catch(()=>null);
  if(!res.ok){const msg=typeof data?.detail==="string"?data.detail:"A MOTA videófeldolgozó nem tudta elérni ezt a videót.";return NextResponse.json({error:msg},{status:502})}
  const ingredients=Array.isArray(data?.ingredients)?data.ingredients.map((x:{name?:unknown;amount?:unknown;note?:unknown})=>({name:String(x?.name||""),amount:String(x?.amount||""),unit:"",note:String(x?.note||"")})).filter((x:{name:string})=>x.name):[];
  const steps=Array.isArray(data?.method_steps)?data.method_steps.map(String):[];
  const recipe={title:String(data?.title||"Videóból kinyert recept"),category:String(data?.recipe_group||"Egyéb"),ingredients,steps,uncertainties:[],sourceUrl:parsed.toString(),platform:String(data?.platform||""),sourcePageName:String(data?.source_page_name||""),thumbnailUrl:String(data?.thumbnail_url||""),hungarianSummary:String(data?.hungarian_summary||""),techniques:Array.isArray(data?.techniques)?data.techniques:[],plating:Array.isArray(data?.plating)?data.plating:[],chefTips:Array.isArray(data?.chef_tips)?data.chef_tips:[],originalTranscript:String(data?.original_transcript||""),hungarianTranslation:String(data?.hungarian_translation||"")};
  return NextResponse.json({suggestion:recipe,requiresApproval:true,source:"mota-import",notice:"A videóelemzés gépi javaslat; a hozzávalók, mennyiségek és technológia ellenőrzendő."});
 }catch(e){return NextResponse.json({error:e instanceof Error&&e.name==="AbortError"?"A videóelemzés időtúllépés miatt megszakadt. Próbáld újra a MOTA Importban.":"A videóelemző szolgáltatás nem érhető el."},{status:504})}finally{clearTimeout(timer)}
}
