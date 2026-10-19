import type { LibraryItem, MotaResult } from "./library";

export const BACKUP_FORMAT = "tudaskonyvtar-library-v1";
export type LibraryBackup = {
  format: typeof BACKUP_FORMAT;
  exported_at: string;
  item_count: number;
  items: Array<{source_url:string; result:MotaResult; favorite:boolean; for_competition:boolean; status:"saved"|"to_try"|"tested"; note:string; tags:string[]}>;
};

export function createLibraryBackup(items:LibraryItem[]):LibraryBackup {
  return {
    format:BACKUP_FORMAT,
    exported_at:new Date().toISOString(),
    item_count:items.length,
    items:items.map(item=>({
      source_url:item.source_url,
      result:{
        ...item.raw_result,
        source_url:item.source_url,
        title:item.title,
        platform:item.platform,
        recipe_group:item.recipe_group,
        hungarian_summary:item.hungarian_summary,
        ingredients:item.ingredients,
        method_steps:item.method_steps,
        thumbnail_url:item.thumbnail_url,
        content_tags:item.content_tags,
        ingredient_tags:item.ingredient_tags,
        tags:item.tags,
      },
      favorite:!!item.favorite,
      for_competition:!!item.for_competition,
      status:item.status,
      note:item.note||"",
      tags:item.tags||[],
    }))
  };
}

export function parseLibraryBackup(raw:string):LibraryBackup {
  if(raw.length>50_000_000)throw Error("A biztonsági mentés túl nagy.");
  let data:unknown;
  try {data=JSON.parse(raw);}catch{throw Error("Nem érvényes JSON biztonsági mentés.");}
  if(!data||typeof data!=="object")throw Error("Érvénytelen mentési formátum.");
  const obj=data as Partial<LibraryBackup>;
  if(obj.format!==BACKUP_FORMAT||!Array.isArray(obj.items))throw Error("Nem támogatott mentési formátum.");
  if(obj.items.length>10000)throw Error("A mentés legfeljebb 10000 elemet tartalmazhat.");
  const seen=new Set<string>();
  const items=obj.items.map(item=>{
    if(!item||typeof item!=="object"||!item.result||typeof item.result!=="object")throw Error("Hibás gyűjteményelem.");
    const url=typeof item.source_url==="string"?item.source_url:"";
    let parsed:URL;
    try{parsed=new URL(url);}catch{throw Error("Hibás forráslink a mentésben.");}
    if(!["https:","http:"].includes(parsed.protocol)||parsed.username||parsed.password)throw Error("Nem támogatott forráslink a mentésben.");
    if(!parsed.hostname||url.length>2048)throw Error("Érvénytelen vagy túl hosszú forráslink.");
    if(item.result.source_url!==url||typeof item.result.title!=="string"||!item.result.title.trim())throw Error("Hiányzó vagy eltérő receptadat a mentésben.");
    if(item.result.title.length>5000)throw Error("Túl hosszú cím a mentésben.");
    if(seen.has(url))throw Error("A mentés ugyanazt a forráslinket többször tartalmazza.");
    seen.add(url);
    if(!["saved","to_try","tested"].includes(item.status))throw Error("Ismeretlen mentési állapot.");
    if(typeof item.favorite!=="boolean"||typeof item.for_competition!=="boolean")throw Error("Hibás kedvenc vagy versenyjelölés.");
    if(typeof item.note!=="string"||item.note.length>100000)throw Error("Hibás megjegyzés.");
    if(!Array.isArray(item.tags)||item.tags.some(tag=>typeof tag!=="string"))throw Error("Hibás címkék.");
    if(typeof item.result.platform!=="string")throw Error("Hiányzó forrástípus.");
    if(item.tags.length>1000||item.tags.some(tag=>tag.length>1000))throw Error("Túl sok vagy túl hosszú címke.");
    for(const field of ["ingredients","method_steps","tags","content_tags","ingredient_tags","techniques","plating","equipment","chef_tips","competition_ideas"] as const){
      const value=item.result[field];
      if(value!==undefined&&!Array.isArray(value))throw Error("Hibás receptmező: "+field);
    }
    if(item.result.ingredients?.some(ingredient=>!ingredient||typeof ingredient!=="object"||Array.isArray(ingredient)||typeof ingredient.name!=="string"||!ingredient.name.trim()||(ingredient.amount!==undefined&&typeof ingredient.amount!=="string")||(ingredient.note!==undefined&&typeof ingredient.note!=="string")))throw Error("Hibás hozzávaló a mentésben.");
    for(const field of ["method_steps","tags","content_tags","ingredient_tags","techniques","plating","equipment","chef_tips","competition_ideas"] as const){
      if(item.result[field]?.some(value=>typeof value!=="string"))throw Error("Hibás szöveges receptmező: "+field);
    }

    return item;
  });
  if(obj.item_count!==items.length)throw Error("Eltér a mentés elemszáma.");
  if(typeof obj.exported_at!=="string"||!Number.isFinite(Date.parse(obj.exported_at)))throw Error("Hiányzó vagy hibás mentési dátum.");
  return obj as LibraryBackup;
}
