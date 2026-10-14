import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
import {authenticated} from "@/lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const TABLES=["teacher_classes","teacher_students","home_exam_records"] as const;
type Check={table:string;exists:boolean;records:number|null;error?:string};
async function inspect(url:string):Promise<Check[]>{
 const sql=neon(url);
 const result:Check[]=[];
 for(const table of TABLES){
  try{
   const exists=await sql`select to_regclass(${"public."+table}) is not null as exists`;
   if(!exists[0]?.exists){result.push({table,exists:false,records:null});continue}
   // Fixed allowlisted SQL table identifiers; return counts, never names or records.
   const rows=table==="teacher_classes"
    ?await sql`select count(*)::integer as count from public.teacher_classes`
    :table==="teacher_students"
    ?await sql`select count(*)::integer as count from public.teacher_students`
    :await sql`select count(*)::integer as count from public.home_exam_records`;
   result.push({table,exists:true,records:Number(rows[0]?.count??0)});
  }catch{
   result.push({table,exists:false,records:null,error:"A tábla állapota nem olvasható."});
  }
 }
 return result;
}
export async function GET(){
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
 const source=process.env.SCHOOL_SOURCE_DATABASE_URL;
 const target=process.env.DATABASE_URL;
 if(!source||!target)return NextResponse.json({ready:false,sourceConfigured:Boolean(source),targetConfigured:Boolean(target),message:"A két adatbázis kapcsolatát még nem állítottuk be. Nem történt adatátvitel.",source:[],target:[]});
 try{
 const [src,dst]=await Promise.all([inspect(source),inspect(target)]);
 return NextResponse.json({ready:src.every(x=>x.exists&&!x.error),sourceConfigured:true,targetConfigured:true,source:src,target:dst,migrationPerformed:false,message:"Csak olvasás: ellenőriztük a táblákat és rekordszámokat. A tanulói adatokhoz nem nyúltunk."});
 }catch{return NextResponse.json({ready:false,sourceConfigured:true,targetConfigured:true,message:"Az adatkapcsolat ellenőrzése sikertelen. Nem történt módosítás.",source:[],target:[]},{status:503})}
}
