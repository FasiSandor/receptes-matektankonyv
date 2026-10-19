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
