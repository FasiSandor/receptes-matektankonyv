"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import KnowledgeShell from "@/components/KnowledgeShell";
import PhotoHero from "@/components/PhotoHero";
import {CheckCircle2,RotateCcw,BookOpen,ArrowLeft,Lightbulb} from "lucide-react";
type Problem={id:string;grade:string;topic:string;question:string;choices:[string,string,string,string];answer:number;explanation:string};
const problems:Problem[]=[
{id:"m9-1",grade:"9",topic:"Algebra",question:"Oldd meg: 3x + 7 = 22",choices:["x = 3","x = 5","x = 7","x = 9"],answer:1,explanation:"Vonj ki 7-et mindkét oldalból: 3x = 15. Oszd el 3-mal: x = 5."},
{id:"m9-2",grade:"9",topic:"Algebra",question:"Mennyi (a + 3)² felbontva?",choices:["a² + 9","a² + 3a + 9","a² + 6a + 9","2a + 6"],answer:2,explanation:"A nevezetes azonosság: (a+b)² = a² + 2ab + b². Itt b = 3."},
{id:"m9-3",grade:"9",topic:"Geometria",question:"Mekkora a 6 cm és 8 cm befogójú derékszögű háromszög átfogója?",choices:["10 cm","12 cm","14 cm","8 cm"],answer:0,explanation:"Pitagorasz: c² = 6² + 8² = 36 + 64 = 100, ezért c = 10 cm."},
{id:"m9-4",grade:"9",topic:"Százalékszámítás",question:"Mennyi 240-nek a 15%-a?",choices:["24","32","36","40"],answer:2,explanation:"240 × 0,15 = 36."},
{id:"m10-1",grade:"10",topic:"Függvények",question:"Ha f(x)=2x−3, mennyi f(4)?",choices:["4","5","6","8"],answer:1,explanation:"Helyettesíts: f(4)=2×4−3=5."},
{id:"m10-2",grade:"10",topic:"Algebra",question:"Melyek az x² − 5x + 6 = 0 gyökei?",choices:["1 és 6","−2 és −3","2 és 3","−1 és −6"],answer:2,explanation:"Szorzattá alakítva (x−2)(x−3)=0, így a gyökök 2 és 3."},
{id:"m10-3",grade:"10",topic:"Geometria",question:"Mennyi a 4 cm sugarú kör területe?",choices:["8π cm²","16π cm²","4π cm²","32π cm²"],answer:1,explanation:"A kör területe T=πr²=π×4²=16π cm²."},
{id:"m11-1",grade:"11",topic:"Sorozatok",question:"A 3, 7, 11, 15, ... számtani sorozat 10. tagja?",choices:["35","39","40","43"],answer:1,explanation:"a₁₀ = 3 + 9×4 = 39."},
{id:"m11-2",grade:"11",topic:"Valószínűség",question:"Szabályos dobókockával mekkora a páros szám dobásának valószínűsége?",choices:["1/6","1/3","1/2","2/3"],answer:2,explanation:"Három kedvező eset: 2, 4, 6. Összesen hat eset, ezért 3/6 = 1/2."},
{id:"m11-3",grade:"11",topic:"Trigonometria",question:"Mennyi sin 30° pontos értéke?",choices:["0","1/2","√2/2","1"],answer:1,explanation:"A nevezetes szög szinusza sin 30° = 1/2."},
{id:"m12-1",grade:"12",topic:"Statisztika",question:"Mi a 2, 4, 4, 10 számok átlaga?",choices:["4","5","6","20"],answer:1,explanation:"Az összeg 20, az elemszám 4, ezért az átlag 20/4=5."},
{id:"m12-2",grade:"12",topic:"Valószínűség",question:"Két szabályos érme feldobásakor mennyi az esélye, hogy pontosan egy fej lesz?",choices:["1/4","1/2","3/4","1"],answer:1,explanation:"A négy azonos esélyű eset: FF, FI, IF, II; pontosan egy fej két esetben szerepel."},
{id:"m12-3",grade:"12",topic:"Függvények",question:"Hol van az f(x)=x²−4 függvény zérushelye?",choices:["−4 és 4","csak 2","−2 és 2","nincs"],answer:2,explanation:"x²−4=0 ⇒ x²=4 ⇒ x=−2 vagy x=2."}
{id:"m9-5",grade:"9",topic:"Százalékszámítás",question:"Egy 8000 Ft-os termék ára 25%-kal csökken. Mennyi az új ár?",choices:["2000 Ft","6000 Ft","7000 Ft","7500 Ft"],answer:1,explanation:"A kedvezmény 8000 × 0,25 = 2000 Ft, tehát az új ár 6000 Ft."},
{id:"m9-6",grade:"9",topic:"Algebra",question:"Oldd meg: 5(x−2)=20",choices:["x=2","x=4","x=6","x=8"],answer:2,explanation:"Oszd el 5-tel: x−2=4, majd adj hozzá 2-t: x=6."},
{id:"m9-7",grade:"9",topic:"Geometria",question:"Mekkora egy 7 cm és 4 cm oldalú téglalap területe?",choices:["11 cm²","22 cm²","28 cm²","34 cm²"],answer:2,explanation:"A terület 7 × 4 = 28 cm²."},
{id:"m9-8",grade:"9",topic:"Statisztika",question:"Mi a 2, 7, 9 számok mediánja?",choices:["2","6","7","9"],answer:2,explanation:"Rendezett sorozatban a középső elem 7."},
{id:"m10-4",grade:"10",topic:"Függvények",question:"Hol metszi az f(x)=3x+6 grafikonja az x-tengelyt?",choices:["x=−3","x=−2","x=2","x=6"],answer:1,explanation:"A zérushelyhez 3x+6=0, tehát x=−2."},
{id:"m10-5",grade:"10",topic:"Algebra",question:"Mennyi (x−4)(x+4)?",choices:["x²−16","x²+16","x²−8x+16","2x²−16"],answer:0,explanation:"Két tag összegének és különbségének szorzata: a²−b²."},
{id:"m10-6",grade:"10",topic:"Geometria",question:"Mennyi egy 3 cm sugarú kör kerülete?",choices:["3π cm","6π cm","9π cm","12π cm"],answer:1,explanation:"K=2πr=2π×3=6π cm."},
{id:"m10-7",grade:"10",topic:"Százalékszámítás",question:"Egy mennyiség 20%-os növelés után 120. Mennyi volt eredetileg?",choices:["80","96","100","110"],answer:2,explanation:"Az eredeti mennyiség 1,2-szerese 120: 120 / 1,2 = 100."},
{id:"m11-4",grade:"11",topic:"Sorozatok",question:"A 2, 6, 18, 54, ... mértani sorozat 5. tagja?",choices:["108","126","144","162"],answer:3,explanation:"A hányados 3, így 54 × 3 = 162."},
{id:"m11-5",grade:"11",topic:"Trigonometria",question:"Mennyi cos 60° pontos értéke?",choices:["0","1/2","√3/2","1"],answer:1,explanation:"A nevezetes szög koszinusza cos 60° = 1/2."},
{id:"m11-6",grade:"11",topic:"Valószínűség",question:"Zsákban 3 piros és 2 kék golyó van. Visszatevés nélkül egyet húzunk. Mennyi a piros esélye?",choices:["2/5","3/5","1/2","3/2"],answer:1,explanation:"Összesen 5 golyó közül 3 piros, tehát a valószínűség 3/5."},
{id:"m11-7",grade:"11",topic:"Függvények",question:"Mennyi a f(x)=x²−6x+9 minimumértéke?",choices:["−9","0","3","9"],answer:1,explanation:"f(x)=(x−3)², ezért a minimum 0, az x=3 helyen."},
{id:"m12-4",grade:"12",topic:"Statisztika",question:"Mi a 3, 3, 4, 5, 10 adatok módusza?",choices:["3","4","5","10"],answer:0,explanation:"A 3 fordul elő a legtöbbször, ezért ez a módusz."},
{id:"m12-5",grade:"12",topic:"Valószínűség",question:"Mekkora annak az esélye, hogy két szabályos dobókocka összege 7?",choices:["1/12","1/9","1/6","1/3"],answer:2,explanation:"36 egyformán valószínű rendezett kimenetből 6 ad 7-es összeget, azaz 6/36=1/6."},
{id:"m12-6",grade:"12",topic:"Függvények",question:"Hány zérushelye van az f(x)=x²+1 függvénynek a valós számok között?",choices:["0","1","2","végtelen"],answer:0,explanation:"Minden valós x-re x²≥0, így x²+1 mindig pozitív."},
{id:"m12-7",grade:"12",topic:"Geometria",question:"Egy 2 cm élű kocka térfogata?",choices:["4 cm³","6 cm³","8 cm³","12 cm³"],answer:2,explanation:"A kocka térfogata a³=2³=8 cm³."},
];
type Stored=Record<string,number>;
const storageKey="tk-matematika-gyakorlas-v1";
export default function Practice(){
 const [grade,setGrade]=useState("9"),[topic,setTopic]=useState("Összes"),[answers,setAnswers]=useState<Stored>({}),[hydrated,setHydrated]=useState(false),[details,setDetails]=useState<string[]>([]);
 useEffect(()=>{try{const raw=localStorage.getItem(storageKey);if(raw){const value=JSON.parse(raw);if(value&&typeof value==="object"&&!Array.isArray(value)){setAnswers(Object.fromEntries(Object.entries(value).filter(([id,n])=>problems.some(p=>p.id===id)&&typeof n==="number"&&Number.isInteger(n)&&n>=0&&n<=3)) as Stored)}}}catch{}setHydrated(true)},[]);
 useEffect(()=>{if(hydrated)localStorage.setItem(storageKey,JSON.stringify(answers))},[answers,hydrated]);
 const perGrade=useMemo(()=>problems.filter(p=>p.grade===grade),[grade]);
 const topics=useMemo(()=>["Összes",...new Set(perGrade.map(p=>p.topic))],[perGrade]);
 const shown=useMemo(()=>perGrade.filter(p=>topic==="Összes"||p.topic===topic),[perGrade,topic]);
 const total=perGrade.filter(p=>answers[p.id]!==undefined).length;
 const correct=perGrade.filter(p=>answers[p.id]===p.answer).length;
 const reset=()=>{if(confirm("Törlöd ennek az évfolyamnak a gyakorlási eredményeit ezen a készüléken?")){setAnswers(old=>Object.fromEntries(Object.entries(old).filter(([id])=>!perGrade.some(p=>p.id===id))));setDetails([])}};
 return <KnowledgeShell><PhotoHero title="Matematika gyakorló" subtitle="ÉVFOLYAMOK · ÖNELLENŐRZÉS · MAGYARÁZATOK" image="/images/library/math.jpg"/>
 <div className="kh-actions" style={{marginBottom:17}}><Link className="kh-btn secondary" href="/matematika"><ArrowLeft size={17} style={{verticalAlign:"middle"}}/> Matematika</Link><Link className="kh-btn secondary" href="/klasszikus?view=math"><BookOpen size={17} style={{verticalAlign:"middle"}}/> Tankönyv</Link></div>
 <section className="kh-card"><h2 style={{marginTop:0}}>Évfolyam és témakör</h2><div className="kh-actions">{["9","10","11","12"].map(g=><button key={g} className={"kh-btn "+(grade===g?"":"secondary")} aria-pressed={grade===g} onClick={()=>{setGrade(g);setTopic("Összes")}}>{g}. évfolyam</button>)}</div><div className="kh-actions" style={{marginTop:14}}>{topics.map(t=><button key={t} className={"kh-btn "+(topic===t?"":"secondary")} aria-pressed={topic===t} onClick={()=>setTopic(t)}>{t}</button>)}</div><div className="kh-progress"><strong>{correct} helyes / {perGrade.length} feladat</strong><span>{total} megválaszolva · csak ezen a készüléken mentve</span><div className="kh-progress-track"><div style={{width:100*correct/perGrade.length+"%"}}/></div></div><button className="kh-btn secondary" type="button" onClick={reset}><RotateCcw size={16} style={{verticalAlign:"middle"}}/> Évfolyam eredményeinek törlése</button></section>
 <div className="kh-practice-list">{shown.map((p,n)=>{const chosen=answers[p.id],answered=chosen!==undefined,good=chosen===p.answer,open=details.includes(p.id);return <article className="kh-card" key={p.id}><div className="kh-muted">{p.grade}. évfolyam · {p.topic} · {n+1}. feladat</div><h3>{p.question}</h3><div className="kh-answer-grid">{p.choices.map((choice,i)=><button key={i} type="button" aria-pressed={chosen===i} className={"kh-answer "+(chosen===i?"selected ":"")+(answered&&i===p.answer?"correct":"")+(chosen===i&&!good?" incorrect":"")} onClick={()=>setAnswers(a=>({...a,[p.id]:i}))}><span>{String.fromCharCode(65+i)}</span>{choice}{chosen===i&&<CheckCircle2 size={18} aria-hidden="true"/>}</button>)}</div>{answered&&<p role="status" className={good?"kh-answer-status correct":"kh-answer-status"}>{good?"Helyes megoldás!":"Még nem jó. Próbáld újra, vagy nézd meg a magyarázatot."}</p>}<button className="kh-btn secondary" onClick={()=>setDetails(a=>open?a.filter(id=>id!==p.id):[...a,p.id])}><Lightbulb size={16} style={{verticalAlign:"middle"}}/> {open?"Magyarázat elrejtése":"Megoldásmagyarázat"}</button>{open&&<div className="kh-explanation">{p.explanation}</div>}</article>})}</div></KnowledgeShell>
}
