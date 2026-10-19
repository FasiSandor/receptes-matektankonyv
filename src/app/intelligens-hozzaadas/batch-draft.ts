export type BatchDraftEntry = {
 url:string;title:string;description:string;ingredients:string[];steps:string[];kind:string;
 error?:string;selected:boolean;author:string;recipeYield:string;prepTime:string;cookTime:string;
 image:string;category:string;cuisine:string;calories:string;keywords:string[];saved:boolean;
 errorPhase?:"analyze"|"save";
};
export const BATCH_DRAFT_FORMAT="tudaskonyvtar-batch-draft-v1";
const MAX_ITEMS=15;
const MAX_SIZE=1_000_000;
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==="object"&&!Array.isArray(v);}
function field(v:unknown,max=10000){if(typeof v!=="string"||v.length>max)throw Error("Hibás vagy túl hosszú szöveges mező.");return v;}
function strings(v:unknown,maxItems:number,maxChars:number){
 if(!Array.isArray(v)||v.length>maxItems)return null;
 return v.map(x=>field(x,maxChars));
}
function safeUrl(v:unknown){
 const raw=field(v,2048);let u:URL;
 try{u=new URL(raw);}catch{throw Error("Érvénytelen webcím a munkamenetben.");}
 if(!["https:","http:"].includes(u.protocol)||u.username||u.password)throw Error("Tiltott webcím a munkamenetben.");
 return u.toString();
}
export function parseBatchDraft(text:string):BatchDraftEntry[]{
 if(new TextEncoder().encode(text).length>MAX_SIZE)throw Error("A munkamenet túl nagy (maximum 1 MB).");
 let value:unknown;
 try{value=JSON.parse(text);}catch{throw Error("A fájl nem érvényes JSON.");}
 if(!record(value)||value.format!==BATCH_DRAFT_FORMAT||!Array.isArray(value.items)||value.items.length>MAX_ITEMS)throw Error("Nem támogatott vagy túl nagy munkamenet.");
 const seen=new Set<string>();
 return value.items.map((raw:unknown)=>{
  if(!record(raw))throw Error("Hibás munkamenet-elem.");
  const url=safeUrl(raw.url);
  if(seen.has(url))throw Error("Ismétlődő webcím a munkamenetben.");
  seen.add(url);
  const ingredients=strings(raw.ingredients,200,1000);
  const steps=strings(raw.steps,200,5000);
  const keywords=strings(raw.keywords,30,200);
  if(!ingredients||!steps||!keywords||typeof raw.selected!=="boolean"||typeof raw.saved!=="boolean")throw Error("Hibás lista vagy állapot a munkamenetben.");
  const error=raw.error===undefined?undefined:field(raw.error,2000);
  const errorPhase=raw.errorPhase===undefined?undefined:raw.errorPhase;
  if(errorPhase!==undefined&&errorPhase!=="analyze"&&errorPhase!=="save")throw Error("Hibás hibatípus.");
  return {url,title:field(raw.title,5000),description:field(raw.description,20000),ingredients,steps,
   kind:field(raw.kind,40),selected:raw.selected,author:field(raw.author,1000),
   recipeYield:field(raw.recipeYield,500),prepTime:field(raw.prepTime,200),
   cookTime:field(raw.cookTime,200),image:raw.image?safeUrl(raw.image):"",
   category:field(raw.category,500),cuisine:field(raw.cuisine,500),calories:field(raw.calories,200),
   keywords,saved:raw.saved,error,errorPhase} satisfies BatchDraftEntry;
 });
}
export function createBatchDraft(items:BatchDraftEntry[]):string{
 const text=JSON.stringify({format:BATCH_DRAFT_FORMAT,exported_at:new Date().toISOString(),items});
 parseBatchDraft(text);
 return text;
}
