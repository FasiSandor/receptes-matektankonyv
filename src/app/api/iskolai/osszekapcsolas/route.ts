import {neon} from "@neondatabase/serverless";
import {NextRequest,NextResponse} from "next/server";
import {authenticated} from "@/lib/auth";
import {issueSchoolCookie,linkedSchoolOwner,schoolCookieName,schoolLinkReady,validateLinkCode} from "@/lib/school-link";
export const runtime="nodejs";export const dynamic="force-dynamic";
const opts={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict" as const,path:"/",maxAge:365*24*60*60};
export async function GET(){if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});return NextResponse.json({ready:schoolLinkReady()&&Boolean(process.env.SCHOOL_SOURCE_DATABASE_URL),linked:Boolean(await linkedSchoolOwner()),sourceConfigured:Boolean(process.env.SCHOOL_SOURCE_DATABASE_URL),message:!schoolLinkReady()?"Az összekapcsolás titkos kulcsa nincs konfigurálva.":!process.env.SCHOOL_SOURCE_DATABASE_URL?"Az iskolai adatkapcsolat még nem aktív.":"Az összekapcsolás készen áll."},{headers:{"Cache-Control":"private, no-store"}})}
export async function POST(request:NextRequest){
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)return NextResponse.json({error:"Érvénytelen kérésforrás."},{status:403});
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
 if(!schoolLinkReady())return NextResponse.json({error:"Az összekapcsolás még nincs konfigurálva."},{status:503});
 const body=await request.json().catch(()=>({}));
 const token=validateLinkCode(String(body.code||"").trim());
 if(!token)return NextResponse.json({error:"A kód érvénytelen vagy lejárt."},{status:400});
 const url=process.env.DATABASE_URL;
 if(!url)return NextResponse.json({error:"Az egyszeri kód ellenőrzése nincs konfigurálva."},{status:503});
 try{
 const sql=neon(url);
 await sql`create table if not exists school_link_used_nonces (nonce text primary key, expires_at timestamptz not null, used_at timestamptz not null default now())`;
 const inserted=await sql`insert into school_link_used_nonces (nonce,expires_at) values (${token.nonce},to_timestamp(${token.expires}/1000.0)) on conflict do nothing returning nonce`;
 if(!inserted.length)return NextResponse.json({error:"Ezt az összekapcsolási kódot már felhasználtad. Kérj újat."},{status:409});
 const response=NextResponse.json({ok:true});response.cookies.set(schoolCookieName,issueSchoolCookie(token.owner),opts);return response;
 }catch{return NextResponse.json({error:"A biztonságos összekapcsolás most nem érhető el."},{status:503})}
}
export async function DELETE(request:NextRequest){
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)return NextResponse.json({error:"Érvénytelen kérésforrás."},{status:403});
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
 const response=NextResponse.json({ok:true});response.cookies.set(schoolCookieName,"",{...opts,maxAge:0});return response;
}
