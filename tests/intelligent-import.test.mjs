import "./batch-draft.test.mjs";
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
test("existing collection is reused without overwriting",()=>{assert.match(ui,/restoreLibraryItemIfMissing/);});
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
 assert.match(page,/setRestoreSummary\(\{added,skipped,failed:failed\.length,pending:stopped\?failedEntries\.length-failed\.length:0\}\)/);
 assert.match(page,/setRestoreErrors\(failed\)/);
 assert.match(page,/aria-label="Visszaállítás eredménye"/);
 assert.match(page,/<details><summary>Hibás elemek részletei/);
});

test("backup inspection ignores stale asynchronous file selections",()=>{
 const page=readFileSync(new URL("../src/app/mota-import/gyujtemeny/page.tsx",import.meta.url),"utf8");
 assert.match(page,/const backupInspectionSequence = useRef\(0\)/);
 assert.match(page,/const inspection=\+\+backupInspectionSequence\.current/);
 assert.match(page,/if\(inspection!==backupInspectionSequence\.current\)return/);
 assert.match(page,/backupInspectionSequence\.current\+\+/);
});

test("backup restore offers explicit retry of failed entries only",()=>{
 const page=readFileSync(new URL("../src/app/mota-import/gyujtemeny/page.tsx",import.meta.url),"utf8");
 assert.match(page,/failedEntries\.push\(entry\)/);
 assert.match(page,/setRestoreFailedEntries\(failedEntries\)/);
 assert.match(page,/items:restoreFailedEntries,item_count:restoreFailedEntries\.length/);
 assert.match(page,/sikertelen vagy feldolgozatlan elem folytatása/);
 assert.match(page,/Jóváhagyás után indul a visszaállítás/);
});

test("backup file inspection exposes progress and prevents premature restore",()=>{
 const page=readFileSync(new URL("../src/app/mota-import/gyujtemeny/page.tsx",import.meta.url),"utf8");
 assert.match(page,/const \[inspectBusy,setInspectBusy\] = useState\(false\)/);
 assert.match(page,/setInspectBusy\(true\)/);
 assert.match(page,/setInspectBusy\(false\)/);
 assert.match(page,/disabled=\{restoreBusy\|\|inspectBusy\} onClick=\{\(\)=>void restoreBackup\(\)\}/);
});

test("restore can stop safely and resume the unprocessed tail",()=>{
 const page=readFileSync(new URL("../src/app/mota-import/gyujtemeny/page.tsx",import.meta.url),"utf8");
 assert.match(page,/restoreStopRequested\.current=true/);
 assert.match(page,/if\(restoreStopRequested\.current\)\{stopped=true;failedEntries\.push\(\.\.\.restorePreview\.items\.slice\(index\)\);break;\}/);
 assert.match(page,/Visszaállítás megszakítása/);
 assert.match(page,/feldolgozatlan elem folytatása/);
 assert.match(page,/if\(!failed\.length&&!stopped\)setRestorePreview\(null\)/);
});

test("cancelled backup reports unprocessed items separately from failed items",()=>{
 const page=readFileSync(new URL("../src/app/mota-import/gyujtemeny/page.tsx",import.meta.url),"utf8");
 assert.match(page,/pending:stopped\?failedEntries\.length-failed\.length:0/);
 assert.match(page,/\{restoreSummary\.pending\} feldolgozatlan elem/);
});

test("restore warns before page unload and prevents switching library key mid-operation",()=>{
 const page=readFileSync(new URL("../src/app/mota-import/gyujtemeny/page.tsx",import.meta.url),"utf8");
 assert.match(page,/window\.addEventListener\("beforeunload",warn\)/);
 assert.match(page,/window\.removeEventListener\("beforeunload",warn\)/);
 assert.match(page,/if\(restoreBusy\|\|inspectBusy\|\|backupBusy\)/);
 assert.match(page,/disabled=\{restoreBusy\|\|inspectBusy\|\|backupBusy\} onClick=\{importKey\}/);
});

test("failed or unprocessed restore entries can be exported as a validated standalone backup",()=>{
 const page=readFileSync(new URL("../src/app/mota-import/gyujtemeny/page.tsx",import.meta.url),"utf8");
 assert.match(page,/function downloadRemainingBackup\(\)/);
 assert.match(page,/item_count:restoreFailedEntries\.length/);
 assert.match(page,/items:restoreFailedEntries/);
 assert.match(page,/parseLibraryBackup\(json\)/);
 assert.match(page,/onClick=\{downloadRemainingBackup\}/);
 assert.match(page,/Hátralévő \{restoreFailedEntries\.length\} recept letöltése JSON-ként/);
});

test("bulk import retains metadata, supports selective retry and marks saved entries",()=>{
 assert.match(ui,/type BatchEntry=/);
 assert.match(ui,/recipeYield:String\(data\.recipeYield/);
 assert.match(ui,/thumbnail_url:entry\.image/);
 assert.match(ui,/ingredient_tags:entry\.keywords/);
 assert.match(ui,/retryOnly\?batchResults\.filter/);
 assert.match(ui,/saved:true/);
 assert.match(ui,/Sikertelen linkek újrapróbálása/);
 assert.match(ui,/Megszakítás/);
});

test("bulk retry distinguishes failed extraction from failed saving",()=>{
 assert.match(ui,/errorPhase:"analyze"/);
 assert.match(ui,/errorPhase:"save"/);
 assert.match(ui,/x\.errorPhase==="analyze"/);
 assert.match(ui,/Mentési hibák újrapróbálása/);
 assert.match(ui,/!x\.saved&&x\.title\.trim\(\)/);
});

test("bulk import does not replace existing library recipes",()=>{
 assert.match(ui,/restoreLibraryItemIfMissing\(result\)/);
 assert.match(ui,/if\(!inserted\)/);
 assert.match(ui,/errorPhase:"duplicate"/);
 assert.match(ui,/meglévő recept változatlan maradt/);
});

test("bulk import preflight prevents redundant extraction of existing recipes",()=>{
 assert.match(ui,/const \[batchOnlyNew,setBatchOnlyNew\]/);
 assert.match(ui,/const existing=await listLibrarySourceUrls\(\)/);
 assert.match(ui,/if\(existingUrls\.has\(url\)\)/);
 assert.match(ui,/Már meglévő linkek kihagyása/);
 assert.match(ui,/A meglévő gyűjtemény ellenőrzése nem sikerült/);
});

test("bulk preflight canonicalizes equivalent source URL forms",()=>{
 assert.match(ui,/new URL\(x\)\.toString\(\)/);
 assert.match(ui,/new URL\(x\.trim\(\)\)/);
});

test("single URL import preserves previously saved library entries",()=>{
 assert.match(ui,/const inserted=await restoreLibraryItemIfMissing\(result\)/);
 assert.match(ui,/A meglévő receptet nem módosítottuk/);
 assert.doesNotMatch(ui,/await saveLibraryResult\(result\)/);
});

test("untrusted forwarding headers cannot create fresh rate limit identities",()=>{assert.doesNotMatch(api,/req\.headers\.get\("x-forwarded-for"\)/);assert.match(api,/const key="shared"/);});

test("IPv4 allowlist rejects private, reserved and documentation ranges",async()=>{
 const {runInNewContext}=await import("node:vm");
 const net=await import("node:net");
 const source=api.match(/function publicIPv4\(ip:string\) \{[\s\S]*?\n\}/)?.[0];
 assert.ok(source,"publicIPv4 helper exists");
 const js=source.replace("ip:string","ip");
 const check=runInNewContext(js+"; publicIPv4", {net});
 for(const ip of ["127.0.0.1","10.0.0.1","172.16.1.2","192.168.1.1","169.254.1.1","100.64.0.1","192.0.0.8","198.51.100.1","203.0.113.7","240.1.2.3","255.255.255.255","::1"]){
  assert.equal(check(ip),false,"must reject "+ip);
 }
 for(const ip of ["8.8.8.8","1.1.1.1","9.9.9.9"]){
  assert.equal(check(ip),true,"must permit "+ip);
 }
});

test("library rejects missing keys before hashing or sending REST requests",()=>{assert.match(library,/export async function hashLibraryKey\(key = getLibraryKey\(\)\) \{\s*if \(key\.trim\(\)\.length < 20\)/);assert.match(library,/async function api\(path: string, init: RequestInit = \{\}\) \{\s*const key = getLibraryKey\(\);\s*if \(key\.trim\(\)\.length < 20\)/);});

test("delete keeps video until the library record deletion succeeds",()=>{const fn=library.slice(library.indexOf("export async function deleteLibraryItem("));assert.ok(fn.indexOf('await api(`mota_import_items?id=eq.')>=0);assert.ok(fn.indexOf("if (videoPath) await deleteLibraryVideo(videoPath)")>fn.indexOf('await api(`mota_import_items?id=eq.'));});

test("signed video URLs and deletion require the current collection prefix",()=>{const sign=library.slice(library.indexOf("export async function createLibraryVideoUrl("),library.indexOf("export async function deleteLibraryVideo("));const del=library.slice(library.indexOf("export async function deleteLibraryVideo("),library.indexOf("export async function saveLibraryResult("));assert.match(sign,/if \(!path\.startsWith\(`\$\{keyHash\}\/`\)\) return ""/);assert.match(del,/if \(!path\.startsWith\(`\$\{keyHash\}\/`\)\) throw new Error/);});

test("video deletion reports storage failures instead of swallowing errors",()=>{const del=library.slice(library.indexOf("export async function deleteLibraryVideo("),library.indexOf("export async function saveLibraryResult("));assert.doesNotMatch(del,/\.catch\(\(\) => undefined\)/);assert.match(del,/if \(!response\.ok && response\.status !== 404\)/);assert.match(del,/throw new Error\(detail \|\|/);});

test("signed video URLs cannot request unbounded expiry",()=>{const sign=library.slice(library.indexOf("export async function createLibraryVideoUrl("),library.indexOf("export async function deleteLibraryVideo("));assert.match(sign,/Number\.isInteger\(expiresIn\)/);assert.match(sign,/expiresIn < 60 \|\| expiresIn > 3600/);});

test("remaining restore entries are split into separately valid downloads",()=>{const page=readFileSync(new URL("../src/app/mota-import/gyujtemeny/page.tsx",import.meta.url),"utf8");const fn=page.slice(page.indexOf("function downloadRemainingBackup()"),page.indexOf("async function copyKey()"));assert.match(fn,/const makeParts=/);assert.match(fn,/entries\.length<=10000/);assert.match(fn,/makeParts\(entries\.slice\(0,mid\)\)/);assert.match(fn,/parseLibraryBackup\(json\)/);assert.match(fn,/for\(const \[index,part\] of parts\.entries\(\)\)/);});

test("record deletion must confirm matching deleted row before video removal",()=>{const fn=library.slice(library.indexOf("export async function deleteLibraryItem("));assert.match(fn,/Prefer: "return=representation"/);assert.match(fn,/deleted\.length !== 1 \|\| deleted\[0\]\.id !== id/);assert.ok(fn.indexOf("if (!Array.isArray(deleted)")<fn.indexOf("if (videoPath) await deleteLibraryVideo(videoPath)"));});

test("recipe metadata update confirms exactly the requested row",()=>{const fn=library.slice(library.indexOf("export async function updateLibraryItem("),library.indexOf("export async function deleteLibraryItem("));assert.match(fn,/rows\.length !== 1 \|\| rows\[0\]\.id !== id/);assert.match(fn,/throw new Error\("A recept módosítása nem igazolható\."/);});

test("failed video linking attempts orphan cleanup and verifies linked item",()=>{const fn=library.slice(library.indexOf("export async function uploadLibraryVideo("),library.indexOf("export async function createLibraryVideoUrl("));assert.match(fn,/rows\.length !== 1 \|\| rows\[0\]\.id !== itemId \|\| rows\[0\]\.video_path !== path/);assert.match(fn,/await deleteLibraryVideo\(path\)/);assert.match(fn,/throw error;/);});
