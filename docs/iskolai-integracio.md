# Órai anyag összeállító → Tudáskönyvtár teljes integrációs terv

Állapot: **tervezett adat- és funkciómigráció, NEM éles átvitel**.
Forrás: `FasiSandor/orai-anyag-osszeallito` (`main`), cél: `FasiSandor/receptes-matektankonyv` (`feature/knowledge-hub-ui-recipes-20261014` → ellenőrzés után `main`).
Production: https://orai-anyag-osszeallito.vercel.app és https://receptes-matektankonyv.vercel.app.

## Megőrzési és hozzáférési szabályok
- A régi Vercel projektet és adatbázist nem szabad törölni, és nem szabad megváltoztatni a forrásadatokat.
- Ne mozogjanak tanulói személyes adatok publikus kliensoldali helyre, Supabase nyilvános endpointba vagy GitHubba.
- A régi tanári app `currentOwnerId` mechanizmusa Neon Auth sessionhöz kötődik. Az új app jelszavas cookie-ja **nem azonos** ezzel; a tanári jogosultságokat explicit hitelesítési egyeztetéssel kell átvezetni.
- A `teacher_classes`, `teacher_students` és `home_exam_records` táblák az eredeti alkalmazásban `owner_id` mezőt használnak. A két adatbázis esetleges eltérését külön kell felmérni, adatbázis-URL-ek megosztása nélkül.
- Első műszaki lépés: read-only schema- és rekordszámellenőrzés, majd idempotens migrációs script dry-run és dokumentált rollback. Csak utána valódi átvitel.
- A tanulókhoz kapcsolt vizsga- és riportazonosítókat meg kell őrizni, FK sorrend: osztályok → tanulók → vizsgák; kapcsolódó állományok külön ellenőrzéssel.
- A receptes MOTA gyűjteménykulcsos jogosultsága külön adatdomén marad. Nincs automatikus publikus összevonás tanulói adattal.

## Átemelendő modulok
1. Szakmai oktatás 11., 12., 13. évfolyam (meglévő tanári könyvek, receptek és források).
2. Órakészítő és helyettesítés, tanmenetek, sablonok és források.
3. Tanulótörzs: osztályok, névsor, szerkesztés, archiválás.
4. Házi vizsga: menük, jóváhagyás, pontozás, riportok és kapcsolt dokumentumok.
5. Modern konyhatechnológia.
6. Később ugyanennek a közös forrás- és AI feldolgozómotornak az oktatási egységekhez rendelése.

## Átmeneti működés
A Tudáskönyvtár `/iskolai-anyagok` képes csempéi jelenleg az eredeti, működő tanári alkalmazás pontos útvonalait nyitják meg.
Ez **nem beágyazott adatkapcsolat**, nem teljes integráció. A csempéket az éles átvitel után ugyanazon navigációs szerkezetet megtartva át kell állítani helyi útvonalakra.

## Élesítés előtti elfogadási ellenőrzőlista
- Recepttár és MOTA forrástár: meglévő tételek változatlanok, törlés csak megerősítéssel.
- Mobil/iPad: 4 állandó fül, aktív kiemelés, képek, sötét/világos kézi váltás.
- Tanulótörzs: minden régi és új rekord a megfelelő tulajdonosnál, duplikáció nélkül.
- Házi vizsga: legalább 1 ismert tanuló teljes rekordjának pontos összehasonlítása, a hozzáférés jogosultságának tesztelése.
- Kijelentkezve és másik jogosultsággal tanulói vagy vizsgaadat nem olvasható.
- Teljes Next.js build és ellenőrzött preview; egyetlen tervezett production deploy.
- Régi alkalmazás elérhető rollback célból a jóváhagyásig.
