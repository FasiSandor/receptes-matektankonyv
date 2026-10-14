# Fejlesztési döntések – Receptes és Matektankönyv
Állapot: a 13 alapképernyő terve elfogadott. A v0.1 felület funkcionális prototípus, nem teljes körű megvalósítás.

## Elfogadott képernyők
1. Képes és hierarchikus tartalomjegyzék.
2. Kompakt és helyben kibomló receptlista.
3. Kombinált receptlap, adagszámítás és főzés mód.
4. Automatikus, jóváhagyásköteles importpiszkozatok.
5. Matematika Tankönyv/Tanmenet nézet.
6. Interaktív matematika tananyag, lépésenkénti példák, három szint.
7. Központi videókönyvtár + beágyazás.
8. Közös és modulon belüli kereső.
9. Kombinált intelligens szerkesztő, verziókövetéssel.
10. Kombinált beállítási központ.
11. Fogáskomponáló: saját, Gemini, nyersanyagkosár; kombinált séfműhely.
12. Kombinált Menüstúdió: személyes, verseny, vizsga.
13. Kombinált Vizsgaműhely: vezetett indítás, később szabad navigáció.

## Vizuális döntés
A felhasználó a fejlesztés indításakor a nagyon sötét színvilág helyett világos, prémium digitális könyv-stílust kért. Világos háttér, fehér kártyák, mélykék tipográfia, élénk kék kiemelés. Mobil-first, iPaden kétpaneles szerkesztő/olvasó a későbbi ütemben.

## Kötelező adatmodell – tervezett
- Users, profiles, permissions
- Libraries, categories, contents, content_versions, content_drafts, source_snapshots
- Recipes, ingredients, recipe_ingredients, component_links, assembled_dishes
- Menus, menu_courses, frozen_recipe_version_references
- Exam_projects, exam_baskets, basket_items, exam_rules, rule_evidence, menu_checks
- Learning_grades, topics, lessons, lesson_plans, exercises, solutions
- Media_assets, content_media, video_timestamp_notes
- Import_jobs, AI_runs, collections, collection_items, audit_events

Minden felhasználói adatnak tulajdonosi jogosultsági ellenőrzést kell kapnia. A jóváhagyott verziókat a módosítások nem írhatják át észrevétlenül.

## Gemini
A Gemini API kizárólag szerveroldali útvonalakon keresztül használható, API-kulcs csak környezeti változóban. AI javasolhat receptet, fogást, menüt, magyar fordítást és matematika-magyarázatot. Szakmai jóváhagyás kötelező. Pontos mennyiségeket és a vizsgaszabályokat determinisztikus ellenőrzés számolja/értékeli.

## Vizsga
Feltöltött és ellenőrzött kosár + konkrét verziójú vizsgaszabályzat + jóváhagyott menürecepturák szükségesek a megfelelőséghez. Szabályonként: megfelel / nem felel meg / nem ellenőrizhető. Minden ellenőrzés hivatkozzon forrásdokumentumra. Nem ellenőrizhető követelmény mellett nem adható teljes megfelelőségi minősítés.

## Fejlesztési sorrend
1. Mobilos frontend + 13 navigálható képernyő.
2. DB, Auth, RLS és perzisztens piszkozat.
3. Valódi receptek és komponensek, számítási motor.
4. Szerveroldali import és Gemini-kiértékelés.
5. Menüstúdió és vizsgaellenőrző.
6. Matematikai tananyag és tanmenet.
7. Kereső, export, média, mentések, PWA, tesztek.

## Élesítési szabály
GitHub main → Vercel, csak ellenőrzött nagyobb változtatási csomagok. Eredeti ReceptRendelő és MOTA Learning repók módosítása tilos külön kérés nélkül.
