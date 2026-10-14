import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
const name = "knowledge_session";
function secret() { return process.env.APP_SESSION_SECRET || ""; }
function password() { return process.env.APP_ACCESS_PASSWORD || ""; }
function signature(body:string) { return createHmac("sha256",secret()).update(body).digest("hex"); }
export function ready() { return secret().length >= 32 && password().length >= 16; }
export function verifyPassword(input:string) {
  if(!ready()) return false;
  const expected = Buffer.from(createHmac("sha256",secret()).update(password()).digest("hex"));
  const received = Buffer.from(createHmac("sha256",secret()).update(input).digest("hex"));
  return timingSafeEqual(expected,received);
}
export function issueSession(){
  const data = Buffer.from(JSON.stringify({exp:Date.now()+1000*60*60*24*7,scope:"owner"})).toString("base64url");
  return data+"."+signature(data);
}
export async function authenticated(){
  if(!ready()) return false;
  const raw=(await cookies()).get(name)?.value;
  if(!raw) return false;
  const p=raw.split(".");
  if(p.length!==2 || !/^[a-f0-9]{64}$/.test(p[1])) return false;
  const a=Buffer.from(signature(p[0]),"hex"),b=Buffer.from(p[1],"hex");
  if(!timingSafeEqual(a,b)) return false;
  try { const s=JSON.parse(Buffer.from(p[0],"base64url").toString()); return s.scope==="owner" && typeof s.exp==="number" && s.exp>Date.now(); }catch{return false;}
}
export const cookieName=name;
