import {webcrypto} from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const source=readFileSync(new URL("../src/app/mota-import/library.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;

test("library pagination retrieves all records across three pages without truncation",async()=>{
 const calls=[];
 const rows=Array.from({length:1103},(_,i)=>({id:String(i),title:"Item "+i}));
 const sandbox={exports:{},URL,Date,JSON,TextEncoder,Uint8Array,crypto:webcrypto,window:{},localStorage:{getItem(){return "test-library-key-1234567890";}},fetch:async(url)=>{
  const u=new URL(url);
  const offset=Number(u.searchParams.get("offset")||0);
  const limit=Number(u.searchParams.get("limit")||500);
  calls.push({offset,limit});
  return {ok:true,status:200,text:async()=>JSON.stringify(rows.slice(offset,offset+limit))};
 }};
 vm.runInNewContext(code,sandbox);
 const loaded=await sandbox.exports.listLibraryItems();
 assert.equal(loaded.length,1103);
 assert.deepEqual(calls.map(c=>c.offset),[0,500,1000]);
 assert.equal(loaded[1102].id,"1102");
});

test("library pagination rejects malformed server responses",async()=>{
 const sandbox={exports:{},URL,Date,JSON,TextEncoder,Uint8Array,crypto:webcrypto,window:{},localStorage:{getItem(){return "test-library-key-1234567890";}},fetch:async()=>({ok:true,status:200,text:async()=>'{"unexpected":"object"}'})};
 vm.runInNewContext(code,sandbox);
 await assert.rejects(()=>sandbox.exports.listLibraryItems(),/Hibás gyűjteményválasz/);
});

test("restore inserts missing records with ignore-duplicates rather than upsert",async()=>{
 const calls=[];
 const sandbox={exports:{},URL,Date,JSON,TextEncoder,Uint8Array,crypto:webcrypto,window:{},localStorage:{getItem(){return "test-library-key-1234567890";}},fetch:async(url,init)=>{
  calls.push({url,init});
  return {ok:true,status:201,text:async()=>JSON.stringify([])};
 }};
 vm.runInNewContext(code,sandbox);
 const restored=await sandbox.exports.restoreLibraryItemIfMissing({source_url:"https://example.com/recipe",title:"Test recipe",platform:"web"});
 assert.equal(restored,null);
 assert.equal(calls.length,1);
 assert.equal(calls[0].init.headers["x-mota-library-key"],"test-library-key-1234567890");
 assert.match(calls[0].url,/on_conflict=library_key_hash,source_url/);
 assert.match(calls[0].init.headers.Prefer,/resolution=ignore-duplicates/);
 assert.doesNotMatch(calls[0].init.headers.Prefer,/merge-duplicates/);
});

test("restore creates a new record without using merge-duplicates",async()=>{
 const calls=[];
 const sandbox={exports:{},URL,Date,JSON,TextEncoder,Uint8Array,crypto:webcrypto,window:{},localStorage:{getItem(){return "test-library-key-1234567890";}},fetch:async(url,init)=>{
  calls.push({url,init});
  return {ok:true,status:201,text:async()=>JSON.stringify([{id:"new-1",title:"New recipe"}])};
 }};
 vm.runInNewContext(code,sandbox);
 const result=await sandbox.exports.restoreLibraryItemIfMissing({source_url:"https://example.com/new",title:"New recipe",platform:"web"},{favorite:true,for_competition:false,status:"to_try",note:"keep",tags:["desszert"]});
 assert.equal(result.id,"new-1");
 assert.equal(calls.length,1);
 assert.equal(calls[0].init.method,"POST");
 assert.match(calls[0].init.headers.Prefer,/ignore-duplicates/);
 assert.equal(JSON.parse(calls[0].init.body).source_url,"https://example.com/new");
 assert.equal(JSON.parse(calls[0].init.body).favorite,true);
 assert.equal(JSON.parse(calls[0].init.body).status,"to_try");
 assert.equal(JSON.parse(calls[0].init.body).note,"keep");
 assert.deepEqual(JSON.parse(calls[0].init.body).tags,["desszert"]);
});
