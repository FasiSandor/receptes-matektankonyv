import {NextResponse} from "next/server";
import {authenticated} from "@/lib/auth";
export const runtime="nodejs";
export const maxDuration=60;
type Frame={data:string;time:number};
export async function POST(req:Request){
 if(!await authenticated())return NextResponse.json({error:"Bejelentkezés szükséges a videóelemzéshez."},{status:401});
 const key=process.env.GEMINI_API_KEY;
 if(!key)return NextResponse.json({error:"Gemini API-kulcs nincs beállítva."},{status:503});
 let data:{frames?:Frame[];sourceUrl?:string;focus?:string;audio?:{data:string;mimeType:string}};
 try{data=await req.json()}catch{return NextResponse.json({error:"Érvénytelen adatok."},{status:400})}
 const frames=data.frames;
 if(!Array.isArray(frames)||frames.length<1||frames.length>12||frames.some(x=>typeof x.data!=="string"||x.data.length>250000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x.data)||typeof x.time!=="number"))return NextResponse.json({error:"1–12 JPG-kép vagy videóképkocka szükséges."},{status:400});
 const audio=data.audio;
 const allowedAudio=["audio/mpeg","audio/mp3","audio/mp4","audio/x-m4a","audio/wav","audio/webm","audio/aac"];
 if(audio && (typeof audio.data!=="string" || audio.data.length>2800000 || !/^[A-Za-z0-9+/=]+$/.test(audio.data) || !allowedAudio.includes(audio.mimeType)))return NextResponse.json({error:"Legfeljebb 2 MB-os MP3/M4A/WAV hangrészletet lehet elemzéshez adni."},{status:400});
 const prompt="Magyar szakácsok számára elemezd az időrendben következő főzési videóképkockákat vagy feltöltött receptfotókat. FONTOS: csak a látható tényekből következtess. Ha hangsávot is kaptál, azt is elemezd és a kimondott mennyiségeket a látható műveletekkel együtt értékeld; ha nem kaptál hangot, ne állítsd, hogy hallottad a videót. Ismeretlen mennyiségek, alapanyagok, idők és hőfokok helyére ne találj ki adatot; írd oda: nem állapítható meg. Válasz JSON, kulcsok: title:string, hungarian_summary:string, recipe_group:string, ingredients:[{name:string,amount:string,note:string}], method_steps:string[], techniques:string[], plating:string[], equipment:string[], chef_tips:string[], tags:string[]. A bizonytalan információkat a hungarian_summary végén egyértelműen jelezd. Fókusz: "+String(data.focus||"all").slice(0,30)+".";
 const parts:any[]=[{text:prompt},...frames.flatMap((f,i)=>[{text:"Képkocka "+(i+1)+", "+Math.round(f.time)+" másodpercnél:"},{inlineData:{mimeType:"image/jpeg",data:f.data.split(",")[1]}}]),...(audio?[{text:"A videó hangrészlete, elemezd a kimondott receptadatokat is:"},{inlineData:{mimeType:audio.mimeType,data:audio.data}}]:[])];
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),55000);
 try{
 const res=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify({contents:[{parts}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:3500,temperature:0.2}}),signal:ctrl.signal});
 if(!res.ok)return NextResponse.json({error:"A Gemini képkockaelemzése sikertelen (HTTP "+res.status+")."},{status:502});
 const result=await res.json();const answer=result?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||"").join("")||"";
 if(!answer)return NextResponse.json({error:"A Gemini nem adott értékelhető eredményt."},{status:502});
 const parsed=JSON.parse(answer);
 return NextResponse.json({...parsed,source_url:typeof data.sourceUrl==="string"?data.sourceUrl.slice(0,2000):"",platform:"feltöltött kép/videó",thumbnail_url:frames[0].data,original_transcript:"",hungarian_translation:audio?"A feldolgozás képkockák és csatolt hangrészlet alapján készült.":"A feldolgozás képkockák alapján készült; hangsávot nem elemeztünk."});
 }catch{return NextResponse.json({error:"A videó elemzése megszakadt vagy időtúllépés történt."},{status:502})}finally{clearTimeout(timer)}
}
