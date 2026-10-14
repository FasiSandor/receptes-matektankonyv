import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
import {authenticated} from "@/lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges."},{status:401});
 const url=process.env.SCHOOL_SOURCE_DATABASE_URL;
 const owner=process.env.SCHOOL_SOURCE_OWNER_ID;
 if(!url||!owner)return NextResponse.json({configured:false,message:"Az iskolai adatkapcsolat még nincs beállítva.",classes:[],students:[],records:[]});
 try{
 const sql=neon(url);
 const [classes,students,records]=await Promise.all([
 sql`select id,name,school_year,grade from teacher_classes where owner_id=${owner} and archived=false order by grade nulls last,name`,
 sql`select id,class_id,name from teacher_students where owner_id=${owner} and archived=false order by name`,
 sql`select student_id,school_year,status,menu_approved from home_exam_records where owner_id=${owner} and status <> 'archived'`
 ]);
 return NextResponse.json({configured:true,classes,students,records},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({configured:false,message:"Az adatkapcsolat nem elérhető. Az eredeti tanári app változatlanul működik.",classes:[],students:[],records:[]},{status:503})}
}
