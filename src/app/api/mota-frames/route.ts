import {NextResponse} from "next/server";
import {authenticated} from "@/lib/auth";
export const runtime="nodejs";
export const maxDuration=60;
type Frame={data:string;time:number};
export async function POST(req:Request){
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges a videóelemzéshez."},{status:401});
 const key=process.env.GEMINI_API_KEY;
 if(!key)return NextResponse.json({error:"Gemini API-kulcs nincs beállítva."},{status:503});
 let data:{frames?:Frame[];sourceUrl?:string;focus?:string};
 try{data=await req.json()}catch{return NextResponse.json({error:"Érvénytelen adatok."},{status:400})}
 const frames=data.frames;
 if(!Array.isArray(frames)||frames.length<2||frames.length>12||frames.some(x=>typeof x.data!=="string"||x.data.length>250000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x.data)||typeof x.time!=="number"))return NextResponse.json({error:"2–12 videóképkocka szükséges."},{status:400});
 const prompt="Magyar szakácsok számára elemezd az időrendben következő főzési videóképkockákat. FONTOS: csak a látható tényekből következtess. Hangsávot nem kaptál, ezért nem állíthatod, hogy hallottad a videót. Ismeretlen mennyiségek, alapanyagok, idők és hőfokok helyére ne találj ki adatot; írd oda: nem állapítható meg. Válasz JSON, kulcsok: title:string, hungarian_summary:string, recipe_group:string, ingredients:[{name:string,amount:string,note:string}], method_steps:string[], techniques:string[], plating:string[], equipment:string[], chef_tips:string[], tags:string[]. A bizonytalan információkat a hungarian_summary végén egyértelműen jelezd. Fókusz: "+String(data.focus||"all").slice(0,30)+".";
 const parts:any[]=[{text:prompt},...frames.flatMap((f,i)=>[{text:"Képkocka "+(i+1)+", "+Math.round(f.time)+" másodpercnél:"},{inlineData:{mimeType:"image/jpeg",data:f.data.split(",")[1]}}])];
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),55000);
 try{
 const res=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify({contents:[{parts}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:3500,temperature:0.2}}),signal:ctrl.signal});
 if(!res.ok)return NextResponse.json({error:"A Gemini képkockaelemzése sikertelen (HTTP "+res.status+")."},{status:502});
 const result=await res.json();const answer=result?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||"").join("")||"";
 if(!answer)return NextResponse.json({error:"A Gemini nem adott értékelhető eredményt."},{status:502});
 const parsed=JSON.parse(answer);
 return NextResponse.json({...parsed,source_url:typeof data.sourceUrl==="string"?data.sourceUrl.slice(0,2000):"",platform:"feltöltött videó",thumbnail_url:frames[0].data,original_transcript:"",hungarian_translation:"A feldolgozás képkockák alapján készült; hangsávot nem elemeztünk."});
 }catch{return NextResponse.json({error:"A videó elemzése megszakadt vagy időtúllépés történt."},{status:502})}finally{clearTimeout(timer)}
}
