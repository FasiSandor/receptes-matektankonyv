import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { db,ownerId } from "@/lib/db";
export const runtime="nodejs";
export async function GET(){
  if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
  try { const sql=db(),owner=await ownerId();
    const rows=await sql`SELECT id,title,kind,status,created_at FROM content_items WHERE owner_id=${owner} ORDER BY created_at DESC LIMIT 100`;
    return NextResponse.json({items:rows});
  }catch{return NextResponse.json({error:"A felhőadatok most nem érhetők el."},{status:503})}
}
export async function POST(req:Request){
  if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
  let input:unknown;try{input=await req.json()}catch{return NextResponse.json({error:"Érvénytelen JSON."},{status:400})}
  if(!input || typeof input!=="object")return NextResponse.json({error:"Hibás adatok."},{status:400});
  const d=input as Record<string,unknown>;
  if(typeof d.title!=="string" || d.title.trim().length<2 || d.title.length>250 || !["recipe","math","video","document"].includes(String(d.kind)) || typeof d.body!=="object" || !d.body || JSON.stringify(d.body).length>100000) return NextResponse.json({error:"Hiányzó vagy hibás mezők."},{status:400});
  try {
    const sql=db(),owner=await ownerId();
    const item=await sql`INSERT INTO content_items(owner_id,kind,title,category,status) VALUES(${owner},${d.kind as string},${d.title.trim()},${typeof d.category==="string"?d.category.slice(0,100):null},'draft') RETURNING id`;
    await sql`INSERT INTO content_versions(content_id,version_number,body,source_url) VALUES(${item[0].id},1,${JSON.stringify(d.body)}::jsonb,${typeof d.sourceUrl==="string"?d.sourceUrl.slice(0,2000):null})`;
    return NextResponse.json({id:item[0].id,status:"draft"},{status:201});
  }catch{return NextResponse.json({error:"A piszkozat mentése sikertelen."},{status:503})}
}
