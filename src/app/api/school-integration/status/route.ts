import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
import {authenticated} from "@/lib/auth";
import {linkedSchoolOwner} from "@/lib/school-link";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const noStore={"Cache-Control":"private, no-store"};
export async function GET(){
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401,headers:noStore});
 const owner=await linkedSchoolOwner();
 const url=process.env.SCHOOL_SOURCE_DATABASE_URL;
 if(!owner||!url)return NextResponse.json({ready:false,linked:Boolean(owner),sourceConfigured:Boolean(url),message:!owner?"A tanári fiók még nincs összekapcsolva. Először végezd el az egyszeri összekapcsolást.":"A forrásadatbázis még nincs konfigurálva.",source:[],target:[],migrationPerformed:false},{headers:noStore});
 try{
  const sql=neon(url);
  const [classes,students,exams]=await Promise.all([
   sql`select count(*)::integer as n from teacher_classes where owner_id=${owner} and archived=false`,
   sql`select count(*)::integer as n from teacher_students where owner_id=${owner} and archived=false`,
   sql`select count(*)::integer as n from home_exam_records where owner_id=${owner} and status <> 'archived'`
  ]);
  return NextResponse.json({ready:true,linked:true,sourceConfigured:true,migrationPerformed:false,source:[
   {table:"teacher_classes",exists:true,records:Number(classes[0]?.n??0)},
   {table:"teacher_students",exists:true,records:Number(students[0]?.n??0)},
   {table:"home_exam_records",exists:true,records:Number(exams[0]?.n??0)}
  ],target:[],message:"Sikeres, csak olvasó ellenőrzés. Kizárólag az összekapcsolt tanári fiók rekordjait számoltuk meg; adatátvitel nem történt."},{headers:noStore});
 }catch{return NextResponse.json({ready:false,linked:true,sourceConfigured:true,source:[],target:[],migrationPerformed:false,message:"Az iskolai adatok ellenőrzése sikertelen. Nem történt módosítás."},{status:503,headers:noStore})}
}
