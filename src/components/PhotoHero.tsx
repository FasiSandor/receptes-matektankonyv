import Image from "next/image";
export default function PhotoHero({title,subtitle,image}:{title:string;subtitle:string;image:string}){
return <header className="kh-photo-hero"><Image className="kh-photo-hero-image" src={image} alt="" fill sizes="(max-width: 1160px) 100vw, 1160px" priority={false}/><div className="kh-photo-hero-shade"/><div className="kh-photo-hero-inner"><div className="kh-photo-overline">TUDÁSKÖNYVTÁR</div><h1>{title}</h1><p>{subtitle}</p></div></header>
}
