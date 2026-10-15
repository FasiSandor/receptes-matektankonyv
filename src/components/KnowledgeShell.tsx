"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import "./knowledge.css";
export const foodPics={
recipe:"/images/library/recipe.jpg",
technology:"/images/library/technology.jpg",
sources:"/images/library/sources.jpg",
studio:"/images/library/studio.jpg",
soup:"/images/library/studio.jpg",
main:"/images/library/main.jpg",
starter:"/images/library/starter.jpg",
dessert:"/images/library/dessert.jpg"
};
export function Tile({href,title,subtitle,image}:{href:string;title:string;subtitle:string;image:string}){
return <Link className="kh-tile" href={href}><div className="kh-tile-media" style={{backgroundImage:`url("${image}")`}} aria-hidden="true"/><div className="kh-tile-body"><div className="kh-tile-title">{title}</div><div className="kh-muted" style={{marginTop:6}}>{subtitle}</div></div></Link>}
export default function KnowledgeShell({children}:{children:React.ReactNode}){
const pathname=usePathname();const [theme,setTheme]=useState("dark");
useEffect(()=>{setTheme(localStorage.getItem("tudastar-theme")==="light"?"light":"dark")},[]);
useEffect(()=>{const handler=(e:Event)=>{const val=(e as CustomEvent).detail;setTheme(val==="light"?"light":"dark")};window.addEventListener("kh-theme",handler);return()=>window.removeEventListener("kh-theme",handler)},[]);
const active=pathname.startsWith("/vendeglatas")||pathname.startsWith("/recepttar")||pathname.startsWith("/mota-import")||pathname.startsWith("/technologiak")?"food":pathname.startsWith("/matematika")||pathname.startsWith("/videotar")?"math":pathname.startsWith("/beallitasok")?"settings":"home";
const tabs=[["home","/","⌂","Főoldal"],["food","/vendeglatas","♨","Vendéglátás"],["math","/matematika","∑","Matematika"],["settings","/beallitasok","⚙","Beállítások"]];
return <div className={"kh-root "+(theme==="light"?"light":"dark")}><nav className="kh-navbar" aria-label="Fő navigáció">{tabs.map(([id,href,ico,label])=><Link key={id} href={href} className={"kh-tab "+(id===active?"active":"")} aria-current={id===active?"page":undefined}><span aria-hidden>{ico}</span>{label}</Link>)}</nav><div className="kh-content">{children}</div><Link className="kh-fab" href="/#hozzaadas" aria-label="Intelligens hozzáadás">+</Link></div>}
