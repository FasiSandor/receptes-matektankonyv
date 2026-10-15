"use client";
import PhotoHero from "@/components/PhotoHero";
import {useEffect,useState} from "react";
import KnowledgeShell from "@/components/KnowledgeShell";
type Roster={configured:boolean;message?:string;classes:{id:string;name:string}[];students:{id:string;class_id:string;name:string}[];records:{student_id:string;status:string;menu_approved:boolean}[]};
export default function Page(){
const [data,setData]=useState<Roster|null>(null);
const [active,setActive]=useState("");
useEffect(()=>{fetch("/api/iskolai/tanulok",{cache:"no-store"}).then(r=>r.json()).then((d:Roster)=>{setData(d);setActive(d.classes?.[0]?.id||"")}).catch(()=>setData({configured:false,message:"Adatkapcsolat nem elérhető.",classes:[],students:[],records:[]}))},[]);
return <KnowledgeShell><PhotoHero title="Tanulók" subtitle="OSZTÁLYOK · NÉVSOR · VIZSGAÁLLAPOTOK" image={"/images/library/students.jpg"}/>{!data?<p className="kh-card">Betöltés…</p>:!data.configured?<div className="kh-card"><h2>Kapcsolat előkészítés alatt</h2><p className="kh-muted">{data.message}</p><a className="kh-btn" href="https://orai-anyag-osszeallito.vercel.app/vendeglatas/tanulok">Eredeti névsor megnyitása ↗</a></div>:<><div className="kh-card"><h2>Osztályok</h2><div className="kh-actions">{data.classes.map(c=><button className={"kh-btn "+(active===c.id?"":"secondary")} key={c.id} onClick={()=>setActive(c.id)}>{c.name}</button>)}</div></div><h2 className="kh-section">Névsor</h2>{data.students.filter(s=>s.class_id===active).map(s=>{const exam=data.records.find(r=>r.student_id===s.id);return <div className="kh-recipe" key={s.id} style={{marginBottom:9,justifyContent:"space-between"}}><strong>{s.name}</strong><span className="kh-pill">{exam?.menu_approved?"Menü jóváhagyva":exam?.status||"Nincs vizsga"}</span></div>})}<p className="kh-muted">A névsor itt csak olvasható. A szerkesztés a korábbi tanári alkalmazásban elérhető.</p></>}</KnowledgeShell>
}