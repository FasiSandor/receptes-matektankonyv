# JELENLEGI ÁLLAPOT – 2026-10-19 (ez az irányadó)

**GitHub PR #8, fejlesztési ág. Production merge/deploy NEM történt.** Az alábbi régebbi naplóbejegyzések történeti pillanatképek; a korábbi „nincs HTML import”, „500-as exportlimit”, „nem futott build”, „nincs adatbázispróba” kijelentések **már nem aktuálisak**.

**Automatizált ellenőrzés:** a `da27ece5a789ac9170e41a90c5e0457850e0dab9` commit két workflow-ja, **Build verification** és **Tudaskonyvtar verification**, egyaránt SUCCESS. A későbbi commitok esetén újra ellenőrizni kell.

**Megvalósult:** automatikus HTML Recipe/cikk import és szerkeszthető előnézet; egyedi és legfeljebb 15 linkes tömeges import; menthető/visszatölthető munkamenet; duplikátumot megőrző beszúrás; lapozott gyűjteménylista; JSON biztonsági mentés és részleges, újrapróbálható visszaállítás. A mentés továbbra sem tartalmazza a videófájlok bájtjait.

**Élő MOTA Supabase-ellenőrzés, írások tranzakciós ROLLBACK-kel:** `public.mota_import_items` RLS bekapcsolva; létezik a `(library_key_hash,source_url)` egyedi index. `anon` szereppel, kulcs nélkül 0 látható rekord; idegen hash hozzáférése hamis. Tesztkulcs A-val ideiglenesen beszúrt sor tesztkulcs B-vel nem látható (0 sor). Azonos URL újrabeszúrása `ON CONFLICT DO NOTHING` mellett 1 rekordot hagyott, eredeti címmel. Minden próba visszagörgetve; éles recept nem módosult. **Korlát:** ezek SQL/RLS tesztek, nem teljes böngésző–PostgREST–UI E2E.

**Kiadás előtt hátra:** valós böngészős URL-import és teljes mentés/export/visszaállítás teszt, REST kliens és családi kulcsok ellenőrzése, külső URL feldolgozó SSRF/rate-limit felülvizsgálata, videófájl-mentés korlátainak egyértelmű jelzése. A PDF-import külön későbbi funkció; nem része ennek a HTML-import mérföldkőnek. A felhasználó elfogadott dizájnja, útvonalai és adatai megőrzendők.

---

# Tudáskönyvtár – integrációs fejlesztési állapot (2026-10-19)

Fejlesztési ág: `work/tudaskonyvtar-integracio-20261019`. Élesítésre NEM kész.

## Az ágon ténylegesen megvalósult
- A főoldal a nem közösségi videós HTTP(S) linkeket az `/intelligens-hozzaadas` felületre irányítja.
- Az új felületen a forráslink, cím, összefoglaló, hozzávalók és leírás szerkeszthető.
- Kifejezett mentéssel a meglévő `saveLibraryResult` / Supabase-gyűjtemény használható; az eredeti link megmarad.
- A Facebook, YouTube, TikTok és Instagram meglévő útvonalai nem változtak.

## Nem készült el / kiadást blokkol
- A korábbi ZIP-ben lévő automatikus HTML-feldolgozó még NINCS beépítve; az új oldal ezt nyíltan jelzi.
- A ZIP-es importálót teljes Next.js builddel, DNS/IP/SSRF és tartalomszűrési tesztekkel ellenőrizni kell; szükséges az undici függőség és lockfile.
- Az export/import és médiamentés teljessége, a több példányra kiterjedő rate-limit és a gyűjteménykulcs-visszaállítás még nem igazolt.
- Supabase RLS és jogosultságellenőrzés, build, valós böngészőteszt szükséges.
- Nincs production deploy engedélyezve.

## Megőrzés
Ne módosítsuk a meglévő Supabase táblákat, kulcsokat és videókat; ne töröljük a régi útvonalakat. A fejlesztés csak ezen az ágon folytatódik. A központi szabályzat kötelező.

## 2026-10-19 – Automatikus HTML-import GitHubon
- API: `src/app/api/intelligens-hozzaadas/route.ts`: nyilvános IPv4-re korlátozott, DNS-ellenőrzött és IP-hez kötött `undici` HTTP(S) lekérés; átirányítás és méretkorlát; JSON-LD Recipe, cikkbekezdések feldolgozása.
- UI: `src/app/intelligens-hozzaadas/page.tsx`: „Weboldal feldolgozása” → szerkeszthető mezők → explicit Supabase mentés; kézi rögzítés megmaradt.
- `package.json`: `undici` hozzáadva.
- **Kiadást blokkol:** a GitHub-módosításokhoz nem futott teljes Next.js build vagy éles webes próba. Nincs lockfile-frissítés. Az SSRF védelem, HTML-kódolás és rate limit további biztonsági tesztje szükséges. Az IPv6 címek jelenleg elutasítottak. A rate limit csak szerverpéldányonként működik. A PDF és a közösségi videók nem részei ennek az API-nak.
- A production változat és az adatbázis változatlan. Ne merge-eljük ellenőrzés nélkül.

## 2026-10-19 – Integrációs mérföldkő ellenőrzése
- A korábbi automatikus HTML-import már be van kötve; a dokumentum fentebbi "még NINCS beépítve" mondata történeti állapot, nem a jelenlegi.
- A GitHub Actions külön TypeScript-, Next.js build-, forráskód-, API-integrációs és recept-fixture teszteket futtat, Vercel-deploy nélkül.
- A recept-hozzávalók szövegének mentése megőrzi az eredeti szöveget, a felismert mennyiség az opcionális amount mezőbe kerül.
- A cikk meta leírását a HTML meta címkékből, több attribútumsorrenddel és idézőjelformával olvassa.
- A kérés- és hálózati korlátok továbbra is további biztonsági auditot igényelnek; a memóriában tárolt limit nem globális.
- Még hiányzik: valós külső URL-ekkel ellenőrzött végponttól végpontig import, a Supabase mentés és visszaolvasás igazolása, export/visszaállítás auditja, PDF és közösségi videók külön fejlesztése.
- Production merge/deploy nincs engedélyezve.

## Biztonsági mentés és visszaállítás
- A Gyűjtemény JSON exportot és ellenőrzött, külön megerősítendő visszaállítást tartalmaz a fejlesztési ágon.
- A visszaállítás állapotot és részleges hibát jelez, a duplikált forráslinkeket visszautasítja.
- A 8452cef commit mindkét GitHub workflow-ja sikeres volt.
- Korlát: az export jelenleg legfeljebb 500 lekért rekordot tartalmaz, és nem menti a videófájlokat. Supabase élő próba még hátravan.
- Production deploy nem történt.

## 2026-10-19 – Visszaállítási biztonság és tesztmérföldkő
- A visszaállítás már csak hiányzó rekordot szúr be: PostgREST `resolution=ignore-duplicates` és egyedi `(library_key_hash,source_url)` kulcs; a meglévő rekordok nem módosulnak.
- Az import folytatódik egyedi elemhibánál, és összesítést ad a sikeres, kihagyott és sikertelen elemekről.
- A 2026-10-19-i `c16b2f7` commit Tudaskonyvtar verification ellenőrzése sikeres: TypeScript, Next.js build, import és backup tesztek, 1103 soros lapozási próba, duplikációbiztos beszúrás teszt.
- A következő commitok további hibás receptmezőket és túlméretes címkéket utasítanak vissza.
- Éles Supabase adatbázisba nem történt próbaírás; valós RLS és adatmentési teszt külön mérföldkő. Vercel production deploy nincs.

## 2026-10-19 – Aktuális kiadás-előkészítő állapot

- A Gyűjtemény mentése már teljes lapozással olvassa a rekordokat (500-as oldalanként), nem csak az első 500-at. Az export legfeljebb 10 000 elemet és 50 MB-ot enged; nagyobb állományra külön megoldás kell.
- Az export JSON ellenőrzése a letöltés előtt megtörténik. A visszaállítás előnézetet és megerősítést kér; csak hiányzó rekordokat szúr be, a kedvenc/verseny/státusz/megjegyzés/címke metaadatokkal együtt.
- Sikertelen elemek külön újrapróbálhatók. Hosszú visszaállítás megszakítható a következő rekord előtt; a feldolgozatlan elemekből folytatható. Az eredmény külön jelzi a hozzáadott, kihagyott, hibás és feldolgozatlan darabszámot.
- Visszaállítás közben az oldal elhagyására figyelmeztet; a gyűjteménykulcs cseréje blokkolt a mentési műveletek alatt.
- Az új `tests/library-restore-integration.test.mjs` működési teszt elkülönített, szimulált Supabase REST válaszokkal ellenőrzi a JSON oda-vissza mentést, duplikátummegőrzést, átmeneti hibát, újrapróbálást és a feldolgozatlan elemek folytatását. Nem élő adatbázis-teszt.
- A `11a2c64` commit Tudaskonyvtar verification futása sikeres volt; az azt követő UI-változásoknál a build sikerült, de egy régi, hárommezős összesítést kereső regressziós teszt elavult. A tesztet a `31db744` commit frissíti; az új ellenőrzés eredményét külön meg kell várni.
- Továbbra is **kiadást blokkol** a valódi Supabase RLS/jogosultság és elkülönített adatbázisos integrációs próba, a valódi böngészős végponttól végpontig teszt, valamint az API biztonsági auditja. PDF-feldolgozás még nincs kész.
- A production adatok változatlanok; sem merge, sem Vercel-deploy nem történt.
