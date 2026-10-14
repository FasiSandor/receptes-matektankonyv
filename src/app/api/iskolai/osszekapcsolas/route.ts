import {NextRequest,NextResponse} from "next/server";
import {authenticated} from "@/lib/auth";
import {issueSchoolCookie,linkedSchoolOwner,schoolCookieName,schoolLinkReady,validateLinkCode} from "@/lib/school-link";
export const runtime="nodejs";export const dynamic="force-dynamic";
const opts={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict" as const,path:"/",maxAge:7*24*60*60};
export async function GET(){if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});return NextResponse.json({ready:schoolLinkReady(),linked:Boolean(await linkedSchoolOwner())},{headers:{"Cache-Control":"no-store"}})}
export async function POST(request:NextRequest){
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
 if(!schoolLinkReady())return NextResponse.json({error:"Az összekapcsolás még nincs konfigurálva."},{status:503});
 const body=await request.json().catch(()=>({}));
 const owner=validateLinkCode(String(body.code||"").trim());
 if(!owner)return NextResponse.json({error:"A kód érvénytelen vagy lejárt."},{status:400});
 const response=NextResponse.json({ok:true});response.cookies.set(schoolCookieName,issueSchoolCookie(owner),opts);return response;
}
export async function DELETE(){
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
 const response=NextResponse.json({ok:true});response.cookies.set(schoolCookieName,"",{...opts,maxAge:0});return response;
}
