import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const source=readFileSync(new URL("../src/app/api/intelligens-hozzaadas/route.ts",import.meta.url),"utf8");
const start=source.indexOf("const entityMap:");
const end=source.indexOf("async function download(");
assert.ok(start>=0&&end>start);
const snippet=source.slice(start,end).replace("export function extract(","function extract(");
const compiled=ts.transpileModule(snippet+"\nglobalThis.extract=extract;",{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}});
const sandbox={URL};vm.runInNewContext(compiled.outputText,sandbox);
const extract=sandbox.extract;

test("Recipe JSON-LD extracts ingredient quantities and nested HowToSteps",()=>{
 const html=`<html><head><title>Fallback title</title>
 <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage","name":"Page"},{"@type":"Recipe","name":"Hagymás rostélyos","description":"Marhahús hagymával","recipeIngredient":["40 dkg marhahús",{"name":"2 db vöröshagyma"}],"recipeInstructions":[{"@type":"HowToSection","name":"Előkészítés","itemListElement":[{"@type":"HowToStep","text":"A húst szeleteljük."},{"@type":"HowToStep","name":"A hagymát megtisztítjuk."}]}]}]}</script></head><body></body></html>`;
 const result=extract(html,"https://example.com/recept");
 assert.equal(result.kind,"recipe");
 assert.equal(result.title,"Hagymás rostélyos");
 assert.equal(result.ingredients.length,2);
 assert.equal(result.ingredients[0],"40 dkg marhahús");
 assert.equal(result.ingredients[1],"2 db vöröshagyma");
 assert.equal(result.steps.length,2);
 assert.equal(result.steps[0],"A húst szeleteljük.");
 assert.equal(result.steps[1],"A hagymát megtisztítjuk.");
});
test("Article fallback uses title and main content",()=>{
 const result=extract("<html><title>Szakmai cikk</title><main><p>A főzés közben a víz párolgása befolyásolja a kész étel tömegét.</p></main></html>","https://example.com/cikk");
 assert.equal(result.kind,"article");
 assert.equal(result.title,"Szakmai cikk");
 assert.equal(result.paragraphs.length,1);
});

test('meta description fallback',()=>{ const r=extract('<title>Article</title><meta name="description" content="Cooking summary">','https://example.com'); assert.equal(r.description,'Cooking summary'); });

test("article metadata works with reversed attributes and single quotes",()=>{
 const html="<html><head><title>Test</title><meta content='Recept és főzési technológia' name='description'></head></html>";
 const result=extract(html,"https://example.com/article");
 assert.equal(result.description,"Recept és főzési technológia");
});
test("OpenGraph description is extracted when standard metadata is missing",()=>{
 const html='<title>Test</title><meta content="Konyhatechnológiai cikk" property="og:description">';
 assert.equal(extract(html,"https://example.com/article").description,"Konyhatechnológiai cikk");
});

test("structured recipe includes author, servings, times and absolute preview image",()=>{
 const html=`<script type="application/ld+json">{"@type":"Recipe","name":"Töltött paprika","author":{"@type":"Person","name":"Teszt szakács"},"recipeYield":"4 adag","prepTime":"PT20M","cookTime":"PT45M","image":"/images/paprika.jpg","recipeIngredient":["4 db paprika"]}</script>`;
 const result=extract(html,"https://example.com/recept");
 assert.equal(result.author,"Teszt szakács");
 assert.equal(result.recipeYield,"4 adag");
 assert.equal(result.prepTime,"PT20M");
 assert.equal(result.cookTime,"PT45M");
 assert.equal(result.image,"https://example.com/images/paprika.jpg");
});
test("OpenGraph image fallback accepts HTTP images but rejects dangerous schemes",()=>{
 const good=extract('<meta property="og:image" content="/assets/food.jpg">',"https://example.com/article");
 assert.equal(good.image,"https://example.com/assets/food.jpg");
 const bad=extract('<meta property="og:image" content="javascript:alert(1)">',"https://example.com/article");
 assert.equal(bad.image,"");
});

test("recipe category, cuisine, keywords and source-declared calories are extracted",()=>{
 const html=`<script type="application/ld+json">{"@type":"Recipe","name":"Leves","recipeCategory":"Levesek","recipeCuisine":"Magyar","keywords":"hagyományos, ünnepi","nutrition":{"@type":"NutritionInformation","calories":"230 kcal"}}</script>`;
 const result=extract(html,"https://example.com/leves");
 assert.equal(result.category,"Levesek");
 assert.equal(result.cuisine,"Magyar");
 assert.equal(result.calories,"230 kcal");
 assert.equal(result.keywords.length,2);
 assert.equal(result.keywords[1],"ünnepi");
});
