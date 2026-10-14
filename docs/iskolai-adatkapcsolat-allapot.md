# Iskolai adatkapcsolat – ellenőrzött állapot (2026-10-14)

Forrás Neon: `broad-brook-70719505` (`orai-anyag-osszeallito`).
Cél Neon: `little-leaf-81171128` (`Receptes-Matektankonyv`).

A forrásban a `teacher_classes`, `teacher_students`, `home_exam_records` táblák létezését a Neon metaadatlekérdezése igazolta. A célban ezek a táblák jelenleg nincsenek jelen.

A cél Vercel környezetben `DATABASE_URL`, `APP_ACCESS_PASSWORD`, `APP_SESSION_SECRET` szerepel. A két szükséges konfiguráció **még hiányzik**:

- `SCHOOL_SOURCE_DATABASE_URL`: a forrásprojekt kizárólag szerveroldali adatbáziskapcsolata.
- `SCHOOL_SOURCE_OWNER_ID`: a tanári Auth-azonosító, amelyhez a névsorok és vizsgák tartoznak. Ezt hitelesített módon kell feloldani, NEM szabad találgatni vagy `preview-user` értékre állítani.

A `/api/iskolai/tanulok` olvasó API kizárólag akkor ad vissza adatokat, ha a Tudáskönyvtár saját munkamenete érvényes és mindkét env konfigurálva van; a szűrés az explicit `SCHOOL_SOURCE_OWNER_ID` alapján történik. Nem végzi el a fiókok egyesítését, nem szerkeszthet adatot, és nem végzi el a migrációt.

Az átvitel előtti következő lépések: hitelesített tulajdonos megfeleltetése; forrás-cél rekorddarabszám összevetése; cél adatbázis mentés és izolált migrációs teszt; jogosultságteszt; teljes tanári funkciók átemelése. A régi Vercel projekt és Neon adatbázis megmarad.

A `scripts/school-migration.mjs` csak dry-run módban működik, `--apply` esetén explicit visszautasítja a módosítást. Semmilyen személyes rekord nem kerül GitHubra.
