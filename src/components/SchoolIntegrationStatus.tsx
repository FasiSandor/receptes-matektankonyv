"use client";
import {useState} from "react";
type Check={table:string;exists:boolean;records:number|null;error?:string};
type Status={ready:boolean;sourceConfigured:boolean;targetConfigured:boolean;message:string;source:Check[];target:Check[];migrationPerformed?:boolean;error?:string};
const labels:Record<string,string>={teacher_classes:"Osztályok",teacher_students:"Tanulók",home_exam_records:"Házi vizsgák"};
export default function SchoolIntegrationStatus(){
 const [data,setData]=useState<Status|null>(null);
 const [loading,setLoading]=useState(false);
 async function check(){setLoading(true);try{const res=await fetch("/api/school-integration/status",{cache:"no-store"});const json:Status=await res.json();setData(json)}catch{setData({ready:false,sourceConfigured:false,targetConfigured:false,message:"A kapcsolatellenőrzés sikertelen.",source:[],target:[]})}finally{setLoading(false)}}
 return <section className="kh-card" style={{marginTop:20}}><h2 style={{marginTop:0}}>Integráció állapota</h2><p className="kh-muted">Az eredeti tanulói és vizsgaadatok továbbra is a tanári alkalmazásban vannak. A kapcsolat kizárólag az összekapcsolt tanári fiók osztályait, tanulóit és vizsgáit számolja meg, adatátvitel nélkül.</p><button className="kh-btn secondary" type="button" disabled={loading} onClick={()=>void check()}>{loading?"Ellenőrzés…":"Adatkapcsolat ellenőrzése"}</button>{data&&<div style={{marginTop:12}}><p role="status" className="kh-muted">{data.message}</p>{data.source.length>0&&<div style={{display:"grid",gap:9}}>{data.source.map((row,i)=><div key={row.table} style={{display:"flex",justifyContent:"space-between",gap:12,borderBottom:"1px solid #2a3445",paddingBottom:7,fontSize:13}}><strong>{labels[row.table]||row.table}</strong><span>{row.error?"Nem olvasható":row.exists?(row.records+" rekord"):"Nem található"}</span></div>)}</div>}</div>}</section>;
}