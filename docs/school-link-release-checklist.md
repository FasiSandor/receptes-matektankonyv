# Iskolai integráció – összehangolt kiadás ellenőrzőlista

## Két meglévő alkalmazás
- Tanári alkalmazás: `FasiSandor/orai-anyag-osszeallito`, PR #6, source branch `feature/secure-school-link-20261014`
- Tudáskönyvtár: `FasiSandor/receptes-matektankonyv`, PR #6, source branch `feature/secure-school-link-20261014`

## Kapcsolódás
1. Az eredeti Neon Auth-os tanári bejelentkezés kiad egy *egyszer használható*, öt percig érvényes, szerveroldalon aláírt kapcsolatkódot.
2. A Tudáskönyvtár már létező jelszavas munkamenetében váltható be a kód.
3. A Tudáskönyvtár Neon adatbázisában a felhasznált nonce atomikusan rögzül, így újból nem váltható be.
4. Siker esetén HttpOnly, Secure és SameSite Strict, aláírt cookie jelzi a tanári fiókot ezen az eszközön; a kódot nem kell újra kérni minden belépéskor.
5. A személyes tanulói és vizsgaadatokat a forrás-DB-ből csak az összekapcsolt tulajdonosra szűrt lekérdezés érheti el.
6. A kapcsolat bármikor bontható a Tudáskönyvtár felületén. Ez a helyi kapcsolatot szünteti meg; a régi tanári fiókot és adatokat nem törli.

## Konfiguráció és teszt
- **SCHOOL_LINK_SECRET**: két alkalmazásban *pontosan ugyanaz*, mindkettőn kizárólag szerveroldali secret. Preview-ban konfigurált.
- **SCHOOL_SOURCE_DATABASE_URL**: kizárólag a Tudáskönyvtárban, Preview környezetben már konfigurált, az eredeti tanári DB-re mutat.
- **DATABASE_URL** a Tudáskönyvtárban az egyszer használható kódok nyilvántartásához kell.
- A kapcsolatkód-végpontok CSRF-ellenőrzéssel védettek. Semmilyen secret vagy személyes adat ne kerüljön GitHubba / kliensoldali környezetbe.
- Preview teszt: bejelentkezés a tanári alkalmazásba; kód kiadása; beváltás a Tudáskönyvtárban; újrabeváltás tiltása; kapcsolat bontása; hozzáférési próbák kijelentkezve.
- Élesítés előtt ellenőrizni kell, hogy a tanári alkalmazás új ágának Vercel Preview deployja READY legyen. A korábbi kísérlet **CANCELED** volt, nem bizonyította a build helyességét.
- A Tudáskönyvtár preview buildje READY, az integráció élesben azonban *nincs tesztelve*.
- Mindkét production projekt módosítása összehangoltan, csak sikeres ellenőrzés után történhet.

## Korlátok
- Az eredeti tanári rendszer tanulói és vizsgatáblái nem kerültek másolásra a Tudáskönyvtárba. Az új névsor és vizsgaoldal csak olvasó, a szerkesztés az eredeti alkalmazásban marad.
- A Tudáskönyvtár belépése jelenleg egy tulajdonosi jelszó, nem teljes többfelhasználós Auth; ha további felhasználók jelennek meg, jogosultsági modellváltás szükséges.
- A tanulói adatok kezeléséhez külön adatminimalizálási, mentési és hozzáférés-ellenőrzési audit javasolt.
