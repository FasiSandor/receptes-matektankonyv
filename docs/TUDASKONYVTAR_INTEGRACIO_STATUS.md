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
