import {createHmac,timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
export const schoolCookieName="school_teacher_link";
function key(){return process.env.SCHOOL_LINK_SECRET||""}
export function schoolLinkReady(){return key().length>=32}
function sign(raw:string){return createHmac("sha256",key()).update(raw).digest("base64url")}
function safeEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
export function validateLinkCode(code:string){
 if(!schoolLinkReady()||code.length>4096)return null;
 const [raw,sig,extra]=code.split(".");
 if(!raw||!sig||extra||!safeEqual(sig,sign(raw)))return null;
 try{const d=JSON.parse(Buffer.from(raw,"base64url").toString("utf8"));return d.v===1&&d.aud==="receptes-matektankonyv"&&typeof d.sub==="string"&&d.sub.length>8&&typeof d.exp==="number"&&d.exp>Date.now()&&d.exp<Date.now()+5*60*1000&&/^[a-f0-9]{32}$/.test(d.nonce)?{owner:d.sub as string,nonce:d.nonce as string,expires:d.exp as number}:null}catch{return null}
}
export function issueSchoolCookie(owner:string){const raw=Buffer.from(JSON.stringify({owner,exp:Date.now()+365*24*60*60*1000})).toString("base64url");return raw+"."+sign(raw)}
export async function linkedSchoolOwner(){
 if(!schoolLinkReady())return null;
 const code=(await cookies()).get(schoolCookieName)?.value;
 if(!code)return null;
 const [raw,sig,extra]=code.split(".");
 if(!raw||!sig||extra||!safeEqual(sig,sign(raw)))return null;
 try{const d=JSON.parse(Buffer.from(raw,"base64url").toString("utf8"));return typeof d.owner==="string"&&d.owner.length>8&&d.exp>Date.now()?d.owner as string:null}catch{return null}
}
