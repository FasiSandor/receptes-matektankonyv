import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const source=readFileSync(new URL("../src/app/mota-import/library-backup.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source+"\nglobalThis.backupApi={createLibraryBackup,parseLibraryBackup,BACKUP_FORMAT};",{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText.replace(/export \{\};?/g,"");
const sandbox={URL,Date,JSON,Error,exports:{}};vm.runInNewContext(code,sandbox);
const {createLibraryBackup,parseLibraryBackup,BACKUP_FORMAT}=sandbox.backupApi;
const item={source_url:"https://example.com/recipe",title:"Teszt recept",platform:"weboldal",recipe_group:"Főétel",hungarian_summary:"Leírás",ingredients:[{name:"liszt",amount:"20 dkg"}],method_steps:["Keverjük össze."],content_tags:[],ingredient_tags:[],tags:[],raw_result:{title:"Régi cím",source_url:"https://example.com/recipe",platform:"weboldal"},favorite:true,for_competition:false,status:"tested",note:"Saját megjegyzés"};
test("backup exports current visible recipe fields and preferences",()=>{
 const backup=createLibraryBackup([item]);
 assert.equal(backup.format,BACKUP_FORMAT);
 assert.equal(backup.item_count,1);
 assert.equal(backup.items[0].result.title,"Teszt recept");
 assert.equal(backup.items[0].result.ingredients[0].amount,"20 dkg");
 assert.equal(backup.items[0].favorite,true);
 assert.equal(backup.items[0].note,"Saját megjegyzés");
 assert.equal(parseLibraryBackup(JSON.stringify(backup)).items.length,1);
});
test("backup rejects unsupported formats and invalid URLs",()=>{
 const backup=createLibraryBackup([item]);
 assert.throws(()=>parseLibraryBackup(JSON.stringify({...backup,format:"other"})));
 backup.items[0].source_url="file:///etc/passwd";
 assert.throws(()=>parseLibraryBackup(JSON.stringify(backup)));
});
test("backup rejects corrupt JSON and mismatched counts",()=>{
 assert.throws(()=>parseLibraryBackup("{"));
 const backup=createLibraryBackup([item]);
 backup.item_count=2;
 assert.throws(()=>parseLibraryBackup(JSON.stringify(backup)));
});

test("backup rejects invalid preference fields before restore",()=>{
 const backup=createLibraryBackup([item]);
 backup.items[0].favorite="yes";
 assert.throws(()=>parseLibraryBackup(JSON.stringify(backup)));
});
test("backup rejects malformed ingredient and tag structures",()=>{
 const backup=createLibraryBackup([item]);
 backup.items[0].result.ingredients="not-an-array";
 assert.throws(()=>parseLibraryBackup(JSON.stringify(backup)));
});
