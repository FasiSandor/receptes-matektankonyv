"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import "./knowledge.css";
export const foodPics={
recipe:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=82",
technology:"https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=900&q=82",
sources:"https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&q=82",
studio:"https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=82",
soup:"https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=82",
main:"https://images.unsplash.com/photo-1544025162-d76694265947?w=900&q=82",
starter:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=82",
dessert:"https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&q=82"
};
export function Tile({href,title,subtitle,image}:{href:string;title:string;subtitle:string;image:string}){
const [imageFailed,setImageFailed]=useState(false);
const fallback=title.toLowerCase().includes("matemat")?"∑":title.toLowerCase().includes("recept")?"♨":title.toLowerCase().includes("vide")?"▶":title.toLowerCase().includes("iskola")?"▤":"✧";
return <Link className="kh-tile" href={href}><div className="kh-tile-media">{!imageFailed?<img src={image} alt="" loading="lazy" onError={()=>setImageFailed(true)}/>:<div className="kh-tile-fallback" aria-hidden="true">{fallback}</div>}</div><div className="kh-tile-body"><div className="kh-tile-title">{title}</div><div className="kh-muted" style={{marginTop:6}}>{subtitle}</div></div></Link>}
export default function KnowledgeShell({children}:{children:React.ReactNode}){
const pathname=usePathname();const [theme,setTheme]=useState("dark");
useEffect(()=>{setTheme(localStorage.getItem("tudastar-theme")==="light"?"light":"dark")},[]);
useEffect(()=>{const handler=(e:Event)=>{const val=(e as CustomEvent).detail;setTheme(val==="light"?"light":"dark")};window.addEventListener("kh-theme",handler);return()=>window.removeEventListener("kh-theme",handler)},[]);
const active=pathname.startsWith("/vendeglatas")||pathname.startsWith("/recepttar")||pathname.startsWith("/mota-import")?"food":pathname.startsWith("/matematika")?"math":pathname.startsWith("/beallitasok")?"settings":"home";
const tabs=[["home","/","⌂","Főoldal"],["food","/vendeglatas","♨","Vendéglátás"],["math","/matematika","∑","Matematika"],["settings","/beallitasok","⚙","Beállítások"]];
return <div className={"kh-root "+(theme==="light"?"light":"dark")}><nav className="kh-navbar" aria-label="Fő navigáció">{tabs.map(([id,href,ico,label])=><Link key={id} href={href} className={"kh-tab "+(id===active?"active":"")} aria-current={id===active?"page":undefined}><span aria-hidden>{ico}</span>{label}</Link>)}</nav><div className="kh-content">{children}</div><Link className="kh-fab" href="/#hozzaadas" aria-label="Intelligens hozzáadás">+</Link></div>}
