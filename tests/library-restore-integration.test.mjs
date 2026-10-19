import {webcrypto} from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import vm from "node:vm";

function load(path,sandbox){
 const source=readFileSync(new URL(path,import.meta.url),"utf8");
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,sandbox);
 return sandbox.exports;
}
const key="isolated-integration-test-key";
const recipe=(n)=>({
 source_url:"https://example.test/recipe/"+n,
 title:"Recept "+n,
 platform:"web",
 recipe_group:"Főétel",
 hungarian_summary:"Leírás "+n,
 ingredients:[{name:"Liszt",amount:"100 g"}],
 method_steps:["Előkészítés","Elkészítés"],
 tags:["teszt"]
});
const libraryRow=(result,extra={})=>({
 ...result,id:"id-"+result.title,raw_result:result,
 favorite:false,for_competition:false,status:"saved",note:"",...extra
});

test("backup roundtrip: pagination, duplicate preservation, partial failure and retry",async()=>{
 const database=new Map();
 const calls=[];
 let failOnce="https://example.test/recipe/3";
 const fetch=async(url,init={})=>{
  const u=new URL(url);
  const method=init.method||"GET";
  assert.equal(init.headers["x-mota-library-key"],key);
  if(method==="GET"){
   const offset=Number(u.searchParams.get("offset")||0);
   const limit=Number(u.searchParams.get("limit")||500);
   const rows=[...database.values()].slice(offset,offset+limit);
   calls.push({method,offset});
   return {ok:true,status:200,text:async()=>JSON.stringify(rows)};
  }
  if(method==="POST"){
   const body=JSON.parse(init.body);
   calls.push({method,url:body.source_url,prefer:init.headers.Prefer});
   assert.match(init.headers.Prefer,/resolution=ignore-duplicates/);
   if(body.source_url===failOnce){
    failOnce="";
    return {ok:false,status:503,text:async()=>JSON.stringify({message:"Temporary failure"})};
   }
   if(database.has(body.source_url))
    return {ok:true,status:201,text:async()=>JSON.stringify([])};
   const row={...body,id:"new-"+database.size};
   database.set(body.source_url,row);
   return {ok:true,status:201,text:async()=>JSON.stringify([row])};
  }
  throw Error("Unexpected method "+method);
 };
 const sandbox={exports:{},URL,Date,JSON,TextEncoder,Uint8Array,crypto:webcrypto,window:{},localStorage:{getItem(){return key;}},fetch};
 const lib=load("../src/app/mota-import/library.ts",sandbox);
 const backup=load("../src/app/mota-import/library-backup.ts",{exports:{},URL,Date,JSON,Set});
 const first=recipe(1),second=recipe(2),third=recipe(3),fourth=recipe(4);
 const original=[libraryRow(first,{favorite:true,status:"tested",note:"Saját megjegyzés",tags:["kedvenc"]}),libraryRow(second),libraryRow(third),libraryRow(fourth)];
 const saved=backup.parseLibraryBackup(JSON.stringify(backup.createLibraryBackup(original)));
 assert.equal(saved.item_count,4);
 database.set(first.source_url,{...original[0],note:"MEGLÉVŐ, NE ÍRD FELÜL"});
 let inserted=0,skipped=0;
 const retry=[];
 for(const entry of saved.items){
  try{
   const row=await lib.restoreLibraryItemIfMissing(entry.result,entry);
   if(row)inserted++;else skipped++;
  }catch{retry.push(entry);}
 }
 assert.equal(inserted,2);
 assert.equal(skipped,1);
 assert.equal(retry.length,1);
 assert.equal(database.get(first.source_url).note,"MEGLÉVŐ, NE ÍRD FELÜL");
 assert.equal(database.get(second.source_url).title,second.title);
 const resumed=await lib.restoreLibraryItemIfMissing(retry[0].result,retry[0]);
 assert.ok(resumed);
 assert.equal(database.size,4);
 const all=await lib.listLibraryItems();
 assert.equal(all.length,4);
 const roundtrip=backup.parseLibraryBackup(JSON.stringify(backup.createLibraryBackup(all)));
 assert.equal(roundtrip.item_count,4);
 assert.equal(roundtrip.items.find(x=>x.source_url===first.source_url).note,"MEGLÉVŐ, NE ÍRD FELÜL");
 assert.equal(roundtrip.items.find(x=>x.source_url===third.source_url).result.title,third.title);
 assert.equal(calls.filter(x=>x.method==="POST").length,5);
});

test("resume processes only unprocessed records after a simulated stop",async()=>{
 const database=new Map();
 const attempted=[];
 const fetch=async(url,init={})=>{
  if(init.method!=="POST")throw Error("Unexpected GET");
  const body=JSON.parse(init.body);
  attempted.push(body.source_url);
  if(database.has(body.source_url))return {ok:true,status:201,text:async()=>JSON.stringify([])};
  const row={...body,id:String(database.size+1)};
  database.set(body.source_url,row);
  return {ok:true,status:201,text:async()=>JSON.stringify([row])};
 };
 const sandbox={exports:{},URL,Date,JSON,TextEncoder,Uint8Array,crypto:webcrypto,window:{},localStorage:{getItem(){return key;}},fetch};
 const lib=load("../src/app/mota-import/library.ts",sandbox);
 const entries=Array.from({length:8},(_,i)=>recipe(i+1));
 let index=0;
 for(;index<3;index++)await lib.restoreLibraryItemIfMissing(entries[index]);
 assert.equal(database.size,3);
 const unprocessed=entries.slice(index);
 for(const item of unprocessed)await lib.restoreLibraryItemIfMissing(item);
 assert.equal(database.size,8);
 assert.deepEqual(attempted,entries.map(x=>x.source_url));
});
