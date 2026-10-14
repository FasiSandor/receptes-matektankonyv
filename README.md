# Receptes és Matektankönyv

Önálló Next.js + TypeScript digitális tudástár, a jóváhagyott 13 képernyő kezdeti felületével.

**Állapot:** v0.1 fejlesztői prototípus. Nem kész produktív receptimportáló, AI vagy vizsgaellenőrző. A mintareceptek és a menütervező demonstrációs adatokon alapulnak.

## Indítás

```bash
npm install
npm run dev
```

## Deploy

Vercel → Import Git Repository → `FasiSandor/receptes-matektankonyv`. Framework: Next.js. Az induló demóhoz nem szükséges API-kulcs.

## Következő fejlesztés

PostgreSQL, Auth, szerveroldali Gemini API, importáló, forrás- és verziókezelés, nyersanyagkosarak, determinisztikus szabálymotor, PDF, tesztelés.

**Biztonság:** API-kulcsot soha ne tegyél a repóba. Gemini kulcs később a Vercel `GEMINI_API_KEY` környezeti változójaként.
