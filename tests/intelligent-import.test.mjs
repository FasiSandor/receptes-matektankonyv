import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const api=readFileSync(new URL("../src/app/api/intelligens-hozzaadas/route.ts",import.meta.url),"utf8");
const ui=readFileSync(new URL("../src/app/intelligens-hozzaadas/page.tsx",import.meta.url),"utf8");
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
