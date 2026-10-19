import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";
import { Agent, request as fetchPinned } from "undici";

export const runtime = "nodejs";
export const maxDuration = 30;
const MAX_BYTES = 2_000_000;
const recent = new Map<string,{count:number,until:number}>();
function publicIPv4(ip:string) {
 if(net.isIP(ip)!==4)return false;
 const [a,b,c,d]=ip.split(".").map(Number);
 return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a===192&&b===0)||(a===198&&(b===18||b===19))||(a===198&&b===51&&c===100)||(a===203&&b===0&&c===113)||(a===192&&b===0&&c===2)||(a===192&&b===88&&c===99)||(a===198&&b===19)||(a===255&&b===255&&c===255&&d===255));
}
async function validate(raw:string) {
 if(raw.length>2048)throw Error("Túl hosszú URL.");
 const u=new URL(raw);
 if(!["http:","https:"].includes(u.protocol)||u.username||u.password||!["","80","443"].includes(u.port))throw Error("Nem támogatott cím.");
 if(net.isIP(u.hostname)||!u.hostname.includes(".")||/\.(local|internal|localhost|test|invalid)$/i.test(u.hostname))throw Error("Helyi cím tiltva.");
 const addresses=await dns.lookup(u.hostname,{all:true});
 if(!addresses.length||addresses.some(a=>!publicIPv4(a.address)))throw Error("Nem engedélyezett cél IP-cím.");
 u.hash="";
 return {u,address:addresses[0].address};
}
const entityMap:Record<string,string>={"&amp;":"&","&quot;":String.fromCharCode(34),"&apos;":String.fromCharCode(39),"&lt;":"<","&gt;":">","&nbsp;":" "};
function decode(s:string) {return s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_m,v:string)=>{const n=v[0].toLowerCase()==="x"?parseInt(v.slice(1),16):Number(v);return n>0&&n<=0x10ffff?String.fromCodePoint(n):"";}).replace(/&(?:amp|quot|apos|lt|gt|nbsp);/gi,m=>(entityMap[m.toLowerCase()]||m));}
function clean(s:string){return decode(s.replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();}
function extract(html:string,url:string){
 let recipe:Record<string,unknown>|null=null;
 function walk(v:unknown):void{if(!v||typeof v!=="object")return;if(Array.isArray(v)){v.forEach(walk);return;}const o=v as Record<string,unknown>;const t=o["@type"];if((typeof t==="string"&&t.toLowerCase()==="recipe")||(Array.isArray(t)&&t.includes("Recipe"))){recipe=o;return;}walk(o["@graph"]);walk(o.mainEntity);walk(o.itemListElement);}
 for(const m of html.matchAll(/<script\b(?=[^>]*type\s*=\s*["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(m[1]));if(recipe)break;}catch{/* skip invalid JSON-LD */}}
 const r=recipe as Record<string,unknown>|null;
 const str=(v:unknown)=>typeof v==="string"?clean(v):"";
 const ingredient=(v:unknown):string=>typeof v==="string"?clean(v):v&&typeof v==="object"?str((v as Record<string,unknown>).name):"";
 const steps=(v:unknown):string[]=>Array.isArray(v)?v.flatMap(steps):typeof v==="string"?[clean(v)]:v&&typeof v==="object"?steps((v as Record<string,unknown>).itemListElement||(v as Record<string,unknown>).text||(v as Record<string,unknown>).name):[];
 const title=str(r?.name)||clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"")||"Névtelen oldal";
 const metaTags=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
 const metaDescription=metaTags.map(tag=>{
  const attrs=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(m=>[m[1].toLowerCase(),m[3]]));
  return ["description","og:description"].includes((attrs.name||attrs.property||"").toLowerCase())?attrs.content||"":"";
 }).find(Boolean)||"";
 const metaValue=(name:string)=>metaTags.map(tag=>{
  const attrs=Object.fromEntries([...tag.matchAll(/([\\w:-]+)\\s*=\\s*(["'])(.*?)\\2/g)].map(m=>[m[1].toLowerCase(),m[3]]));
  return (attrs.name||attrs.property||"").toLowerCase()===name?attrs.content||"":"";
 }).find(Boolean)||"";
 const authorValue=r?.author;
 const author=typeof authorValue==="string"?clean(authorValue):Array.isArray(authorValue)?authorValue.map(a=>typeof a==="object"&&a?str((a as Record<string,unknown>).name):"").filter(Boolean).join(", "):authorValue&&typeof authorValue==="object"?str((authorValue as Record<string,unknown>).name):"";
 const yieldValue=r?.recipeYield;
 const yieldText=Array.isArray(yieldValue)?yieldValue.map(str).filter(Boolean).join(", "):typeof yieldValue==="number"?String(yieldValue):str(yieldValue);
 const time=(v:unknown)=>typeof v==="string"&&/^P(?=\\d|T\\d)(?:\\d+D)?(?:T(?:\\d+H)?(?:\\d+M)?(?:\\d+S)?)?$/i.test(v)?v:"";
 const imageValue=r?.image;
 const imageRaw=typeof imageValue==="string"?imageValue:Array.isArray(imageValue)?imageValue.find(v=>typeof v==="string")||"":imageValue&&typeof imageValue==="object"?str((imageValue as Record<string,unknown>).url):"";
 const imageCandidate=imageRaw||metaValue("og:image")||metaValue("twitter:image");
 let image="";
 try{const candidate=new URL(imageCandidate,url);if(["http:","https:"].includes(candidate.protocol)&&!candidate.username&&!candidate.password)image=candidate.toString();}catch{/* no image */}
 const body=html.replace(/<(script|style|nav|footer|header|aside|form|iframe|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi," ");
 const main=body.match(/<(article|main)\b[^>]*>([\s\S]*?)<\/\1>/i)?.[2]||body;
 const paragraphs=[...main.matchAll(/<(p|h[1-6]|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m=>clean(m[2])).filter(s=>s.length>=25&&!/^(cookie|privacy|hirdetés|feliratkozás|subscribe)/i.test(s)).slice(0,120);
 return {kind:recipe?"recipe":"article",source_url:url,title:title.slice(0,300),description:str(r?.description)||clean(metaDescription),author,recipeYield:yieldText,prepTime:time(r?.prepTime),cookTime:time(r?.cookTime),totalTime:time(r?.totalTime),image,ingredients:Array.isArray(r?.recipeIngredient)?r.recipeIngredient.map(ingredient).filter(Boolean):[],steps:steps(r?.recipeInstructions),paragraphs};
}
async function download(raw:string){
 let current=raw;
 for(let i=0;i<4;i++){
  const {u,address}=await validate(current);
  const agent=new Agent({connect:{lookup:(_host,_opts,cb)=>cb(null,address,4),timeout:10000}});
  try{
   const response=await fetchPinned(u.toString(),{dispatcher:agent,method:"GET",headers:{"accept":"text/html,application/xhtml+xml","user-agent":"TudaskonyvtarImporter/1.0"},headersTimeout:10000,bodyTimeout:10000});
   const status=response.statusCode;
   if(status>=300&&status<400){const location=response.headers.location;if(typeof location!=="string")throw Error("Hibás átirányítás.");response.body.destroy();current=new URL(location,u).toString();continue;}
   if(status!==200){response.body.destroy();throw Error("A forrásoldal nem érhető el (HTTP "+status+").");}
   const type=String(response.headers["content-type"]||"").toLowerCase();
   if(!type.includes("text/html")&&!type.includes("application/xhtml+xml")){response.body.destroy();throw Error("Ez a link nem HTML-oldal. PDF-feldolgozás később.");}
   const len=Number(response.headers["content-length"]||0);if(len>MAX_BYTES){response.body.destroy();throw Error("A weboldal túl nagy.");}
   const parts:Buffer[]=[];let size=0;
   for await(const part of response.body){const chunk=Buffer.from(part);size+=chunk.length;if(size>MAX_BYTES){response.body.destroy();throw Error("A weboldal túl nagy.");}parts.push(chunk);}
   return extract(Buffer.concat(parts).toString("utf8"),u.toString());
  }finally{await agent.close();}
 }
 throw Error("Túl sok átirányítás.");
}
export async function POST(req:NextRequest){
 try{
  const origin=req.headers.get("origin");if(origin&&new URL(origin).origin!==req.nextUrl.origin)return NextResponse.json({error:"Érvénytelen eredet."},{status:403});
  const now=Date.now();for(const [k,v] of recent)if(v.until<now)recent.delete(k);
  const key=(req.headers.get("x-forwarded-for")||"").split(",")[0].trim()||"shared";const entry=recent.get(key);if(entry&&entry.count>=8&&entry.until>now)return NextResponse.json({error:"Túl sok kérés. Próbáld később."},{status:429});
  recent.set(key,entry&&entry.until>now?{...entry,count:entry.count+1}:{count:1,until:now+60000});
  if(req.headers.get("content-type")?.split(";")[0]!=="application/json")return NextResponse.json({error:"JSON szükséges."},{status:415});
  if(Number(req.headers.get("content-length")||0)>4096)return NextResponse.json({error:"Túl nagy kérés."},{status:413});
  const raw=await req.text();if(Buffer.byteLength(raw)>4096)return NextResponse.json({error:"Túl nagy kérés."},{status:413});
  let body:unknown;
  try{body=JSON.parse(raw);}catch{return NextResponse.json({error:"Hibás JSON."},{status:400});}
  if(!body||typeof body!=="object"||typeof (body as {url?:unknown}).url!=="string")return NextResponse.json({error:"Hiányzó link."},{status:400});
  return NextResponse.json(await download((body as {url:string}).url),{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Importhiba."},{status:422});}
}
