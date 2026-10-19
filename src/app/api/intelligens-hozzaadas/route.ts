import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";
const MAX_BYTES = 1_500_000;
function forbidden(ip:string) {
  if(net.isIP(ip)===4){const a=ip.split(".").map(Number);return a[0]===0||a[0]===10||a[0]===127||a[0]>=224||(a[0]===169&&a[1]===254)||(a[0]===172&&a[1]>=16&&a[1]<=31)||(a[0]===192&&a[1]===168)||(a[0]===100&&a[1]>=64&&a[1]<=127)||(a[0]===198&&(a[1]===18||a[1]===19));}
  return true; // Restrict to public IPv4 pending full IPv6 audit
}
function clean(s:string){return s.replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g," ").trim();}
function getMeta(html:string,key:string){const m=html.match(new RegExp('<meta\\s+[^>]*(?:property|name)=["\\\']'+key+'["\\\'][^>]*>','i'))?.[0];return m?.match(/content=["']([^"']*)/i)?.[1]||"";}
function asText(value:unknown):string {if(typeof value==="string")return clean(value);if(value&&typeof value==="object"){const v=value as Record<string,unknown>;return asText(v.text||v.name||"");}return "";}
function instructions(value:unknown):string[]{if(!value)return [];if(Array.isArray(value))return value.flatMap(instructions);if(typeof value==="string")return [clean(value)];if(typeof value==="object"){const v=value as Record<string,unknown>;return v.itemListElement?instructions(v.itemListElement):v.text?[asText(v.text)]:[];}return [];}
function extract(html:string,url:string){
  const blocks=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let recipe:Record<string,unknown>|null=null;
  function seek(x:unknown):void {if(!x||typeof x!=="object")return;if(Array.isArray(x)){x.forEach(seek);return;}const o=x as Record<string,unknown>;const type=o["@type"];if((typeof type==="string"&&type.toLowerCase().includes("recipe"))||(Array.isArray(type)&&type.some(t=>String(t).toLowerCase()==="recipe")))recipe=o;else{seek(o["@graph"]);seek(o.mainEntity);}}
  for(const b of blocks){try{seek(JSON.parse(b[1]));}catch{/* malformed structured data */}}
  const stripped=html.replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<(style|nav|footer|header|aside|form)\b[^>]*>[\s\S]*?<\/\1>/gi," ").replace(/<!--[^]*?-->/g," ");
  const paragraphs=[...stripped.matchAll(/<(?:p|h[2-4]|li)\b[^>]*>([\s\S]*?)<\/(?:p|h[2-4]|li)>/gi)].map(x=>clean(x[1])).filter(x=>x.length>35).slice(0,100);
  const r=recipe as Record<string,unknown>|null;
  const title=asText(r?.name)||clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"")||getMeta(html,"og:title");
  return {kind:r?"recipe":"article",source_url:url,title,description:asText(r?.description)||getMeta(html,"description"),ingredients:Array.isArray(r?.recipeIngredient)?r.recipeIngredient.map(asText).filter(Boolean):[],steps:instructions(r?.recipeInstructions),paragraphs};
}
export async function POST(req:NextRequest){
  try{
    const origin=req.headers.get("origin");if(origin&&new URL(origin).origin!==req.nextUrl.origin)return NextResponse.json({error:"Érvénytelen eredet."},{status:403});
    const body=await req.text();if(body.length>4096)return NextResponse.json({error:"Túl nagy kérés."},{status:413});
    const value=JSON.parse(body).url;if(typeof value!=="string"||value.length>2048)throw Error("Hibás webcím.");
    const u=new URL(value);if(!["https:","http:"].includes(u.protocol)||u.username||u.password||!["","80","443"].includes(u.port)||net.isIP(u.hostname)||!u.hostname.includes(".")||/\.(local|internal|localhost|test|invalid)$/i.test(u.hostname))throw Error("Nem támogatott cím.");
    // Fail closed: this endpoint does not fetch arbitrary remote URLs until DNS pinning is implemented.
    const ips=await dns.lookup(u.hostname,{all:true});if(!ips.length||ips.some(x=>forbidden(x.address)))throw Error("A cím nem biztonságos.");
    return NextResponse.json({error:"Az automatikus letöltés biztonsági ellenőrzésre vár. Használd a kézi mentést."},{status:503});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Feldolgozási hiba."},{status:400});}
}
