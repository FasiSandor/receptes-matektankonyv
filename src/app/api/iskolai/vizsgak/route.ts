import {linkedSchoolOwner} from "@/lib/school-link";
import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
import {authenticated} from "@/lib/auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
const url=process.env.SCHOOL_SOURCE_DATABASE_URL,owner=await linkedSchoolOwner();
if(!url||!owner)return NextResponse.json({configured:false,exams:[],message:!owner?"A tanári fiók még nincs összekapcsolva. Először nyisd meg a Fiók összekapcsolása oldalt.":"Az iskolai adatkapcsolat még nincs beállítva."},{headers:{"Cache-Control":"private, no-store"}});
try{const sql=neon(url);const rows=await sql`select r.id,r.student_id,r.school_year,r.basket,r.menu_approved,r.status,r.updated_at,s.name as student_name,c.name as class_name,c.id as class_id from home_exam_records r join teacher_students s on s.id=r.student_id and s.owner_id=r.owner_id join teacher_classes c on c.id=s.class_id and c.owner_id=r.owner_id where r.owner_id=${owner} and r.status <> 'archived' order by c.name,s.name`;return NextResponse.json({configured:true,exams:rows},{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({configured:false,exams:[],message:"A vizsgák betöltése nem sikerült."},{status:503})}}
