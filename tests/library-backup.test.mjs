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

test("backup rejects duplicate source URLs to avoid overwriting entries",()=>{
 const backup=createLibraryBackup([item,item]);
 assert.throws(()=>parseLibraryBackup(JSON.stringify(backup)));
});

test("backup rejects oversized source links and recipe titles",()=>{
 const backup=createLibraryBackup([item]);
 backup.items[0].source_url="https://example.com/"+ "x".repeat(3000);
 backup.items[0].result.source_url=backup.items[0].source_url;
 assert.throws(()=>parseLibraryBackup(JSON.stringify(backup)));
 const another=createLibraryBackup([item]);
 another.items[0].result.title="x".repeat(5001);
 assert.throws(()=>parseLibraryBackup(JSON.stringify(another)));
});

test("backup rejects malformed ingredient objects and non-text recipe steps",()=>{
 const a=createLibraryBackup([item]);
 a.items[0].result.ingredients=[{amount:"1 kg"}];
 assert.throws(()=>parseLibraryBackup(JSON.stringify(a)));
 const b=createLibraryBackup([item]);
 b.items[0].result.method_steps=[{html:"unexpected"}];
 assert.throws(()=>parseLibraryBackup(JSON.stringify(b)));
});
test("backup rejects oversized metadata tags",()=>{
 const a=createLibraryBackup([item]);
 a.items[0].tags=["x".repeat(1001)];
 assert.throws(()=>parseLibraryBackup(JSON.stringify(a)));
});

test("backup requires a valid export timestamp",()=>{
 const a=createLibraryBackup([item]);
 a.exported_at="not-a-date";
 assert.throws(()=>parseLibraryBackup(JSON.stringify(a)));
 const b=createLibraryBackup([item]);
 delete b.exported_at;
 assert.throws(()=>parseLibraryBackup(JSON.stringify(b)));
});

test("backup rejects malformed extended recipe fields and ingredient details",()=>{
 for(const field of ["techniques","plating","equipment","chef_tips","competition_ideas","content_tags","ingredient_tags","tags"]){
  const backup=createLibraryBackup([item]);
  backup.items[0].result[field]=[null];
  assert.throws(()=>parseLibraryBackup(JSON.stringify(backup)),field);
 }
 const invalid=createLibraryBackup([item]);
 invalid.items[0].result.ingredients=[{name:"Liszt",amount:42}];
 assert.throws(()=>parseLibraryBackup(JSON.stringify(invalid)));
 const empty=createLibraryBackup([item]);
 empty.items[0].result.ingredients=[{name:"   "}];
 assert.throws(()=>parseLibraryBackup(JSON.stringify(empty)));
});

test("export refuses more than 10000 items instead of creating an unrestorable file",()=>{
 const many=Array.from({length:10001},(_,i)=>({...item,id:String(i),source_url:"https://example.com/"+i}));
 assert.throws(()=>createLibraryBackup(many),/10000/);
});
