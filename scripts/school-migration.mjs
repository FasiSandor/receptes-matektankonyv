/**
 * Iskolai adatátvitel – konzervatív, számláló alapú ellenőrzés.
 * Alapértelmezés: DRY RUN. Semmit nem ír az adatbázisba.
 * Beállítások: SCHOOL_SOURCE_DATABASE_URL, DATABASE_URL, SCHOOL_SOURCE_OWNER_ID.
 * A forrás owner_id kötelező; nincs valamennyi tanárra vonatkozó tömeges másolás.
 *
 * Példa: node scripts/school-migration.mjs
 * Az --apply műveletet csak külön jóváhagyott migrációs terv, céladatbázis-backup,
 * azonosított owner mapping és visszaállítási próba után szabad engedélyezni.
 */
import {neon} from "@neondatabase/serverless";
const required=["SCHOOL_SOURCE_DATABASE_URL","DATABASE_URL","SCHOOL_SOURCE_OWNER_ID"];
const missing=required.filter(k=>!process.env[k]);
if(missing.length){console.error("Hiányzó beállítások: "+missing.join(", "));process.exitCode=2;}
else {
 const source=neon(process.env.SCHOOL_SOURCE_DATABASE_URL);
 const target=neon(process.env.DATABASE_URL);
 const owner=process.env.SCHOOL_SOURCE_OWNER_ID;
 const apply=process.argv.includes("--apply");
 if(apply){console.error("Az író migráció NINCS engedélyezve. Először az owner-térképezést, a biztonsági mentést és a rollbacket kell ellenőrizni.");process.exitCode=3;}
 else {
  const schoolTables=["teacher_classes","teacher_students","home_exam_records"];
  const report=[];
  for(const table of schoolTables){
   const existsSource=await source`select to_regclass(${"public."+table}) is not null as yes`;
   const existsTarget=await target`select to_regclass(${"public."+table}) is not null as yes`;
   let sourceCount=null;
   if(existsSource[0]?.yes){
    const res=table==="teacher_classes" ? await source`select count(*)::integer as n from teacher_classes where owner_id=${owner}`
    :table==="teacher_students" ? await source`select count(*)::integer as n from teacher_students where owner_id=${owner}`
    :await source`select count(*)::integer as n from home_exam_records where owner_id=${owner}`;
    sourceCount=res[0]?.n??null;
   }
   report.push({table,sourceExists:Boolean(existsSource[0]?.yes),targetExists:Boolean(existsTarget[0]?.yes),sourceOwnerRecords:sourceCount});
  }
  console.log(JSON.stringify({mode:"dry-run",migrationPerformed:false,tables:report},null,2));
 }
}
