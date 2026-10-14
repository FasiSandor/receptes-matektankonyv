import {NextResponse} from "next/server";
import {authenticated} from "@/lib/auth";
import {lookup} from "node:dns/promises";
import {isIP} from "node:net";
export const runtime="nodejs";
function blocked(ip:string){const a=ip.split(".").map(Number);if(ip.includes(":"))return true;if(a.length!==4)return true;return a[0]===0||a[0]===10||a[0]===127||a[0]>=224||(a[0]===169&&a[1]===254)||(a[0]===172&&a[1]>=16&&a[1]<=31)||(a[0]===192&&a[1]===168)||(a[0]===100&&a[1]>=64&&a[1]<=127)||(a[0]===192&&a[1]===0)||(a[0]===198&&(a[1]===18||a[1]===19));}
async function check(raw:string){const u=new URL(raw);if(u.protocol!=="https:"||u.username||u.password||u.port||isIP(u.hostname)||u.hostname==="localhost"||u.hostname.endsWith(".local"))throw Error("Csak nyilvános HTTPS-weboldal adható meg.");const addresses=await lookup(u.hostname,{all:true,verbatim:true});if(!addresses.length||addresses.some(x=>blocked(x.address)))throw Error("Nem engedélyezett célcím.");return u;}
function textOnly(s:string){return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g," ").trim();}
function recipeNode(value:unknown):Record<string,unknown>|null{if(!value||typeof value!=="object")return null;if(Array.isArray(value)){for(const x of value){const r=recipeNode(x);if(r)return r}return null;}const v=value as Record<string,unknown>;const t=v["@type"];if(t==="Recipe"||(Array.isArray(t)&&t.includes("Recipe")))return v;return recipeNode(v["@graph"]);}
export async function POST(req:Request){
 if(!await authenticated())return NextResponse.json({error:"Belépés szükséges."},{status:401});
 let data:unknown;try{data=await req.json()}catch{return NextResponse.json({error:"Hibás kérés."},{status:400})}
 const raw=(data as {url?:unknown})?.url;if(typeof raw!=="string"||raw.length>2000)return NextResponse.json({error:"Érvényes URL szükséges."},{status:400});
 try{
  let address=await check(raw);let response:Response|null=null;
  for(let i=0;i<3;i++){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);try{response=await fetch(address.toString(),{redirect:"manual",signal:controller.signal,headers:{"User-Agent":"Mozilla/5.0 (compatible; Tudaskonyvtar/0.2)","Accept":"text/html,application/xhtml+xml"}})}finally{clearTimeout(timer)}
   if([301,302,303,307,308].includes(response.status)){const location=response.headers.get("location");if(!location)throw Error("Hibás átirányítás.");address=await check(new URL(location,address).toString());continue}break;
  }
  if(!response||!response.ok)throw Error("Az oldal nem tölthető le.");
  if(!response.headers.get("content-type")?.toLowerCase().includes("text/html"))throw Error("A link nem HTML-tartalom. Itt még csak receptoldalak olvashatók.");
  if(Number(response.headers.get("content-length")||"0")>1000000)throw Error("Az oldal túl nagy.");
  const html=(await response.text()).slice(0,1000000);
  const matches=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let structured:Record<string,unknown>|null=null;
  for(const m of matches){try{structured=recipeNode(JSON.parse(m[1]));if(structured)break}catch{}}
  const title=String(structured?.name||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/\s+/g," ").trim().slice(0,200);
  const ingredients=structured?.recipeIngredient;
  const instructions=structured?.recipeInstructions;
  const lines=Array.isArray(instructions)?instructions.map(x=>typeof x==="string"?x:typeof x==="object"&&x!==null?String((x as {text?:unknown}).text||""):"").filter(Boolean):[];
  const article=html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html;
  const extracted=[title,Array.isArray(ingredients)?"Hozzávalók:\n"+ingredients.join("\n"):"",lines.length?"Elkészítés:\n"+lines.join("\n"):"",textOnly(article).slice(0,14000)].filter(Boolean).join("\n\n").slice(0,16000);
  if(extracted.length<80)throw Error("Nem sikerült elegendő receptszöveget kinyerni.");
  return NextResponse.json({title,sourceUrl:address.toString(),text:extracted,structured:!!structured,notice:"Az automatikusan kinyert adatokat ellenőrizni kell. A weboldal tartalma hiányos lehet."});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"A link nem dolgozható fel. Másold be a szöveget kézzel."},{status:422})}
}
