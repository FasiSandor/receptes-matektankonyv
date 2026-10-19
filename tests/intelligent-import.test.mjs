import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const api=readFileSync(new URL("../src/app/api/intelligens-hozzaadas/route.ts",import.meta.url),"utf8");
const ui=readFileSync(new URL("../src/app/intelligens-hozzaadas/page.tsx",import.meta.url),"utf8");
const library=readFileSync(new URL("../src/app/mota-import/library.ts",import.meta.url),"utf8");
const home=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
test("server-side route uses pinned IP transport",()=>{assert.match(api,/lookup:/);assert.match(api,/dns\.lookup/);assert.match(api,/new Agent/);});
test("redirects are validated",()=>{assert.match(api,/new URL\(location,u\)/);assert.match(api,/validate\(current\)/);});
test("HTML response size is bounded",()=>{assert.match(api,/MAX_BYTES/);assert.match(api,/size\s*>\s*MAX_BYTES/);});
test("no arbitrary script execution",()=>{assert.doesNotMatch(api,/\beval\s*\(/);});
test("existing collection is reused",()=>{assert.match(ui,/saveLibraryResult/);});
test("user reviews result before save",()=>{assert.match(ui,/setTitle\(/);assert.match(ui,/setIngredients\(/);assert.match(ui,/setSteps\(/);});
test("social imports keep their route",()=>{assert.match(home,/mota-import\?url/);});

test("changing source clears stale recipe data",()=>{
 assert.match(ui,/function changeSource/);
 for(const field of ["Title","Summary","Ingredients","Steps"])assert.ok(ui.includes("set"+field+'("");'));
 assert.match(ui,/onChange=\{e=>changeSource\(e.target.value\)\}/);
});

test("structured recipe ingredients and instruction lists are handled",()=>{
 assert.match(api,/recipeIngredient\.map\(ingredient\)/);
 assert.match(api,/walk\(o\.itemListElement\)/);
 assert.match(api,/const ingredient=/);
});

test("stale asynchronous import responses cannot overwrite a changed source",()=>{
 assert.match(ui,/requestId\.current\+=1/);
 assert.match(ui,/id!==requestId\.current\|\|source!==currentUrl\.current\.trim\(\)/);
 assert.match(ui,/if\(id===requestId\.current\)setBusy\(false\)/);
});

test('common Hungarian quantities are stored separately and original text retained',()=>{ assert.match(ui,/kg\|dkg\|g\|mg\|l\|dl\|cl\|ml\|db/); assert.match(ui,/amount:/); assert.match(ui,/note:original/); });

test('ingredient unit list supports cooking measures and abbreviations',()=>{ for(const unit of ['ek','tk','gerezd','fej','szál','szelet','csipet','bögre']) assert.ok(ui.includes('|'+unit),'missing '+unit); });

test('unparsed ingredients also retain their exact original wording',()=>{ assert.match(ui,/\{name:original,note:original\}/); });

test('common fraction characters are recognized as ingredient quantities',()=>{ assert.ok(ui.includes('½¼¾')); });

test('accented Hungarian unit names do not depend on ASCII word boundaries',()=>{ assert.ok(ui.includes('(?=\\s|$)')); assert.ok(ui.includes('evőkanál')); assert.ok(ui.includes('bögre')); });

test('ingredient amount separator supports dash and colon',()=>{ assert.ok(ui.includes('[-–:]?')); });

test("collection listing paginates beyond first 500 rows",()=>{assert.match(library,/offset=\"\+offset/);assert.match(library,/page\.length<PAGE_SIZE/);});

test("restore UI uses insert-only API, tracks individual failures and disables file input while restoring",()=>{
 const page=readFileSync(new URL("../src/app/mota-import/gyujtemeny/page.tsx",import.meta.url),"utf8");
 assert.match(page,/restoreLibraryItemIfMissing\(entry\.result,/);
 assert.doesNotMatch(page,/saveLibraryResult\(entry\.result\)/);
 assert.match(page,/const failed:string\[\]=\[\]/);
 assert.match(page,/setRestoreProgress\(index\+1\)/);
 assert.match(page,/type="file" disabled=\{restoreBusy\}/);
});

test("backup export validates its own JSON before offering download",()=>{
 const page=readFileSync(new URL("../src/app/mota-import/gyujtemeny/page.tsx",import.meta.url),"utf8");
 assert.match(page,/parseLibraryBackup\(json\)/);
 assert.match(page,/blob\.size>50_000_000/);
 assert.doesNotMatch(page,/updateLibraryItem\(saved\.id/);
});

test("restore results persist in an accessible summary with individual error details",()=>{
 const page=readFileSync(new URL("../src/app/mota-import/gyujtemeny/page.tsx",import.meta.url),"utf8");
 assert.match(page,/setRestoreSummary\(\{added,skipped,failed:failed\.length\}\)/);
 assert.match(page,/setRestoreErrors\(failed\)/);
 assert.match(page,/aria-label="Visszaállítás eredménye"/);
 assert.match(page,/<details><summary>Hibás elemek részletei/);
});
