import { NextResponse } from "next/server";
import {authenticated,cookieName,issueSession,ready,verifyPassword} from "@/lib/auth";
export const runtime="nodejs";
export async function GET(){return NextResponse.json({authenticated:await authenticated(),configured:ready()})}
export async function POST(req:Request){
  if(!ready())return NextResponse.json({error:"A hozzáférés még nincs konfigurálva."},{status:503});
  let data:unknown;try{data=await req.json()}catch{return NextResponse.json({error:"Hibás kérés."},{status:400})}
  const pass=typeof data==="object" && data!==null && "password" in data ? (data as {password:unknown}).password : "";
  if(typeof pass!=="string" || pass.length>512 || !verifyPassword(pass)) return NextResponse.json({error:"Hibás jelszó."},{status:401});
  const res=NextResponse.json({authenticated:true});
  res.cookies.set(cookieName,issueSession(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:60*60*24*7});
  return res;
}
export async function DELETE(){
  const res=NextResponse.json({authenticated:false});
  res.cookies.set(cookieName,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:0});
  return res;
}
