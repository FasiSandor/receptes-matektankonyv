import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { db, ownerId } from "@/lib/db";
export const runtime = "nodejs";
type Params = {params:Promise<{id:string}>};
const validId = (id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export async function GET(_:Request,{params}:Params){
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
 const {id}=await params;if(!validId(id))return NextResponse.json({error:"Hibás azonosító."},{status:400});
 try {const sql=db(), owner=await ownerId();
 const rows=await sql`SELECT c.id,c.title,c.kind,c.category,c.status,v.version_number,v.body,v.source_url FROM content_items c JOIN LATERAL (SELECT version_number,body,source_url FROM content_versions WHERE content_id=c.id ORDER BY version_number DESC LIMIT 1) v ON true WHERE c.id=${id} AND c.owner_id=${owner} LIMIT 1`;
 if(!rows.length)return NextResponse.json({error:"Nem található."},{status:404});
 return NextResponse.json({item:rows[0]});}catch{return NextResponse.json({error:"Adatbázishiba."},{status:503})}
}
export async function PATCH(req:Request,{params}:Params){
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
 const {id}=await params;if(!validId(id))return NextResponse.json({error:"Hibás azonosító."},{status:400});
 let d:unknown;try{d=await req.json()}catch{return NextResponse.json({error:"Hibás JSON."},{status:400})}
 if(!d||typeof d!=="object")return NextResponse.json({error:"Hibás adat."},{status:400});
 const item=d as Record<string,unknown>;
 if(typeof item.title!=="string"||item.title.trim().length<2||item.title.length>250||!item.body||typeof item.body!=="object"||JSON.stringify(item.body).length>100000)
 return NextResponse.json({error:"Hibás cím vagy tartalom."},{status:400});
 try {const sql=db(),owner=await ownerId();
 const rows=await sql`SELECT id FROM content_items WHERE id=${id} AND owner_id=${owner} AND status='draft' LIMIT 1`;
 if(!rows.length)return NextResponse.json({error:"Csak saját piszkozat szerkeszthető."},{status:404});
 const latest=await sql`SELECT COALESCE(MAX(version_number),0)::int AS v FROM content_versions WHERE content_id=${id}`;
 const newVersion=Number(latest[0].v)+1;
 await sql`INSERT INTO content_versions(content_id,version_number,body,source_url) VALUES(${id},${newVersion},${JSON.stringify(item.body)}::jsonb,${typeof item.sourceUrl==="string"?item.sourceUrl.slice(0,2000):null})`;
 await sql`UPDATE content_items SET title=${item.title.trim()},category=${typeof item.category==="string"?item.category.slice(0,100):null} WHERE id=${id} AND owner_id=${owner}`;
 return NextResponse.json({id,version:newVersion,status:"draft"});}catch{return NextResponse.json({error:"A mentés sikertelen."},{status:503})}
}

export async function DELETE(_:Request,{params}:Params){
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
 const {id}=await params;if(!validId(id))return NextResponse.json({error:"Hibás azonosító."},{status:400});
 try{
  const sql=db(),owner=await ownerId();
  const rows=await sql`DELETE FROM content_items WHERE id=${id} AND owner_id=${owner} AND status='draft' RETURNING id`;
  if(!rows.length)return NextResponse.json({error:"A piszkozat nem található vagy nem törölhető."},{status:404});
  return NextResponse.json({deleted:true,id});
 }catch{return NextResponse.json({error:"Törlés sikertelen."},{status:503})}
}
