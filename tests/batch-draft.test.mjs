import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source=readFileSync(new URL("../src/app/intelligens-hozzaadas/batch-draft.ts",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={exports:{},URL,TextEncoder};
vm.runInNewContext(js,sandbox);
const {createBatchDraft,parseBatchDraft}=sandbox.exports;
const entry={url:"https://example.com/recept",title:"Leves",description:"Leírás",ingredients:["1 kg hús"],steps:["Főzés"],kind:"recipe",selected:true,author:"Szakács",recipeYield:"4 adag",prepTime:"20 perc",cookTime:"1 óra",image:"https://example.com/kep.jpg",category:"Levesek",cuisine:"Magyar",calories:"220 kcal",keywords:["leves"],saved:false};
test("draft JSON roundtrip preserves edited recipe metadata",()=>{
 const restored=parseBatchDraft(createBatchDraft([entry]));
 assert.equal(restored.length,1);
 assert.equal(restored[0].recipeYield,"4 adag");
 assert.equal(restored[0].image,entry.image);
 assert.equal(restored[0].ingredients[0],"1 kg hús");
});
test("draft rejects invalid formats and private URL schemes",()=>{
 assert.throws(()=>parseBatchDraft(JSON.stringify({format:"wrong",items:[entry]})));
 assert.throws(()=>parseBatchDraft(JSON.stringify({format:"tudaskonyvtar-batch-draft-v1",items:[{...entry,url:"file:///tmp/secret"}]})));
});
test("draft rejects duplicate URLs and excessive records",()=>{
 assert.throws(()=>createBatchDraft([entry,entry]));
 assert.throws(()=>createBatchDraft(Array.from({length:16},(_,i)=>({...entry,url:"https://example.com/"+i}))));
});
test("draft rejects oversized text and malformed metadata",()=>{
 assert.throws(()=>parseBatchDraft("x".repeat(1_000_001)));
 assert.throws(()=>parseBatchDraft(JSON.stringify({format:"tudaskonyvtar-batch-draft-v1",items:[{...entry,ingredients:"not an array"}]})));
});
