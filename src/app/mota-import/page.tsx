"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MotaResult, saveLibraryResult, uploadLibraryVideo } from "./library";
import styles from "./MotaImport.module.css";

type Action = "download" | "extract" | "both";
type Focus = "all" | "recipe" | "technique" | "plating" | "translation";
type Source = "auto" | "facebook" | "instagram" | "tiktok" | "youtube";
type Result = MotaResult;

const actions: { key: Action; icon: string; title: string; text: string }[] = [
  { key: "download", icon: "↓", title: "Videó mentése", text: "Csak a videó letöltése a gyűjteménybe." },
  { key: "extract", icon: "▤", title: "Tartalom kinyerése", text: "Recept, technológia, tálalás, fordítás." },
  { key: "both", icon: "◇", title: "Mindkettő", text: "Videó mentése és a tartalom kinyerése egyszerre." },
];

const sources: { key: Source; label: string; placeholder: string }[] = [
  { key: "auto", label: "Automatikus", placeholder: "Illeszd be a Facebook, Instagram, TikTok vagy YouTube linket…" },
  { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/reel/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/reel/…" },
  { key: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@…/video/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/shorts/…" },
];

const sourceHosts: Record<Exclude<Source, "auto">, string[]> = {
  facebook: ["facebook.com", "fb.watch"],
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
};

function detectSource(value: string): Exclude<Source, "auto"> | null {
  try {
    const host = new URL(value.trim()).hostname.toLowerCase().replace(/^www\./, "");
    for (const [key, hosts] of Object.entries(sourceHosts) as [Exclude<Source, "auto">, string[]][]) {
      if (hosts.some((allowed) => host === allowed || host.endsWith("." + allowed))) return key;
    }
  } catch {}
  return null;
}

function PlatformIcon({ source }: { source: Source }) {
  if (source === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.platformSvg}>
        <path fill="currentColor" d="M13.7 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H17V4a22 22 0 0 0-2.4-.2c-2.4 0-4.1 1.5-4.1 4.2v2H7.8v3h2.7v8h3.2Z"/>
      </svg>
    );
  }
  if (source === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.platformSvg}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="17.4" cy="6.7" r="1.15" fill="currentColor"/>
      </svg>
    );
  }
  if (source === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.platformSvg}>
        <path fill="currentColor" d="M14.2 3h2.6c.3 1.9 1.4 3.1 3.2 3.6v2.7c-1.4-.1-2.6-.5-3.8-1.3v6.7c0 3.6-2.4 6.3-6 6.3-3.2 0-5.7-2.4-5.7-5.5 0-3.5 2.8-5.9 6.3-5.5v2.8c-1.9-.2-3.3.9-3.3 2.7 0 1.5 1.2 2.7 2.8 2.7 1.9 0 3-1.2 3-3.4V3h.9Z"/>
      </svg>
    );
  }
  if (source === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.platformSvg}>
        <path fill="currentColor" d="M21 7.2a2.8 2.8 0 0 0-2-2C17.2 4.7 12 4.7 12 4.7s-5.2 0-7 .5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2.5 12 29 29 0 0 0 3 16.8a2.8 2.8 0 0 0 2 2c1.8.5 7 .5 7 .5s5.2 0 7-.5a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .5-4.8 29 29 0 0 0-.5-4.8ZM10 15.2V8.8l5.5 3.2-5.5 3.2Z"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.platformSvg}>
      <path fill="currentColor" d="m12 2 1.6 5.1L19 9l-5.4 1.9L12 16l-1.6-5.1L5 9l5.4-1.9L12 2Zm7 11 .8 2.3L22 16l-2.2.7L19 19l-.8-2.3L16 16l2.2-.7L19 13Z"/>
    </svg>
  );
}

const focuses: { key: Focus; label: string; icon: string; color: string }[] = [
  { key: "all", label: "Mindent", icon: "☷", color: "#9b82ff" },
  { key: "recipe", label: "Recept", icon: "♧", color: "#ff8e78" },
  { key: "technique", label: "Technológia", icon: "⚙", color: "#63c8e8" },
  { key: "plating", label: "Tálalás", icon: "◉", color: "#f0b36e" },
  { key: "translation", label: "Fordítás", icon: "文", color: "#7ea8ff" },
];

function ResultThumbnail({url}:{url:string}) {
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[url]);
 return failed||!url?<div className={styles.resultThumbFallback} title="A forrás előnézeti képe nem érhető el">▣</div>:<img src={url} alt="Videó előnézeti kép" className={styles.resultThumb} referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>;
}

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <section className={styles.resultBlock}>
      <h3>{title}</h3>
      <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </section>
  );
}

export default function MotaImportPage() {
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<Source>("auto");
  const [action, setAction] = useState<Action>("both");
  const [focus, setFocus] = useState<Focus>("all");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastVideoBlob = useRef<Blob | null>(null);
  const lastVideoUrl = useRef("");

  const detectedSource = useMemo(() => detectSource(url), [url]);
  const sourceConfig = sources.find((item) => item.key === source) ?? sources[0];

  const sourceMatches = useMemo(() => {
    if (!/^https?:\/\//i.test(url.trim())) return false;
    if (source === "auto") return detectedSource !== null;
    return detectedSource === source;
  }, [url, source, detectedSource]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingUrl = params.get("url");
    if (incomingUrl) {
      setUrl(incomingUrl);
      setAction("both");
    }
  }, []);

  const canRun = sourceMatches && !busy;

  async function responseError(response: Response, fallback: string) {
    const raw = await response.text().catch(() => "");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.detail) return String(parsed.detail);
      } catch {}
      const cleaned = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (cleaned) return `HTTP ${response.status}: ${cleaned.slice(0, 180)}`;
    }
    return `HTTP ${response.status}: ${fallback}`;
  }

  async function fetchVideoBlob() {
    const response = await fetch("/api/mota-import/gateway", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), action: "download" }),
    });
    if (!response.ok) throw new Error(await responseError(response, "A videó letöltése nem sikerült."));

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || "mota-video.mp4";
    lastVideoBlob.current = blob;
    lastVideoUrl.current = url.trim();
    return { blob, filename };
  }

  async function saveVideo() {
    setStatus("Videó letöltése…");
    const { blob, filename } = await fetchVideoBlob();
    const file = new File([blob], filename, { type: blob.type || "video/mp4" });

    const fallbackDownload = () => {
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      setStatus("A videó letöltése elindult. iPhone-on a megnyíló videót a Megosztás → Mentés a Fájlokba / Videó mentése menüvel tudod eltenni.");
    };

    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (navigator.share && nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "MOTA Import" });
        setStatus("A videó átadva a megosztási lapnak.");
        return;
      } catch (shareError) {
        const name = shareError instanceof DOMException ? shareError.name : "";
        if (name === "AbortError") {
          setStatus("A megosztást bezártad. A videót újra el tudod indítani a Videó mentése gombbal.");
          return;
        }
        fallbackDownload();
        return;
      }
    }

    fallbackDownload();
  }

  async function extract() {
    setStatus("A videó szakmai elemzése…");
    const response = await fetch("/api/mota-import/gateway", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), focus, action: "extract" }),
    });
    if (!response.ok) throw new Error(await responseError(response, "A kinyerés nem sikerült."));
    const data = await response.json();
    setResult(data);
    setStatus("Kész.");
  }

  async function run() {
    if (!/^https?:\/\//i.test(url.trim())) {
      setError("Illessz be egy érvényes videólinket.");
      return;
    }
    if (!sourceMatches) {
      const expected = sources.find((item) => item.key === source)?.label || "kiválasztott";
      const actual = detectedSource ? sources.find((item) => item.key === detectedSource)?.label : "ismeretlen";
      setError(source === "auto"
        ? "Ezt a linktípust még nem ismerem fel. Facebook, Instagram, TikTok vagy YouTube linket adj meg."
        : `A kiválasztott forrás: ${expected}, de a link alapján ez: ${actual}.`);
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);
    setSaved(false);
    if (lastVideoUrl.current !== url.trim()) {
      lastVideoBlob.current = null;
      lastVideoUrl.current = "";
    }
    try {
      if (action === "download") await saveVideo();
      if (action === "extract") await extract();
      if (action === "both") {
        await extract();
        await saveVideo();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Váratlan hiba történt.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function saveUnprocessedLink() {
    if (saving || !url.trim() || !detectedSource) return;
    setSaving(true);
    setError("");
    try {
      const currentUrl = url.trim();
      await saveLibraryResult({
        title: "Facebook-videó – feldolgozásra vár",
        source_url: currentUrl,
        platform: detectedSource,
        hungarian_summary: "A videó adatait a forrás nem adta át. A link megőrizve; a receptet még nem nyertük ki.",
        recipe_group: "Egyéb",
        ingredients: [],
        method_steps: [],
        tags: ["feldolgozásra vár"],
      });
      setStatus("A videólinket elmentettem a Gyűjteménybe. Receptet még nem nyertem ki.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "A link mentése sikertelen.");
    } finally { setSaving(false); }
  }

  async function saveResult() {
    if (!result || saving) return;
    setSaving(true);
    setError("");
    try {
      setStatus("Anyag mentése a Gyűjteménybe…");
      const item = await saveLibraryResult(result);
      let videoWarning = "";

      try {
        setStatus("Videó mentése a Gyűjteménybe…");
        let blob = lastVideoUrl.current === result.source_url ? lastVideoBlob.current : null;
        if (!blob) {
          const downloaded = await fetchVideoBlob();
          blob = downloaded.blob;
        }
        if (blob) await uploadLibraryVideo(item.id, blob);
      } catch (videoError) {
        videoWarning = videoError instanceof Error ? videoError.message : "A videó külön mentése nem sikerült.";
      }

      setSaved(true);
      setStatus(videoWarning
        ? `Az anyag elmentve. ${videoWarning}`
        : "Elmentve a Gyűjteménybe, videóval együtt.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "A gyűjteménybe mentés nem sikerült.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.shell}><a href="/" style={{display:"inline-block",color:"#b2a0ff",padding:"5px 0 12px",textDecoration:"none",fontSize:13,fontWeight:700}}>← Receptes és Matektankönyv</a>
      <header className={styles.header}>
        <Link href="/mota-import" className={styles.brand}>
          <img src="https://recept-ai-phi.vercel.app/mota-import/icon-180.png" alt="" className={styles.brandIcon} />
          <span className={styles.brandText}>
            <strong>MOTA Import</strong>
            <small>Gasztro videó-katalógus & tudástár</small>
          </span>
        </Link>
        <Link href="/mota-import/gyujtemeny" className={styles.libraryLink}>
          <span className={styles.folderIcon}>▦</span>
          <span>
            <b>Gyűjtemény</b>
            <small>Katalógus megnyitása</small>
          </span>
          <i>→</i>
        </Link>
      </header>

      <section className={styles.hero}>
        <span className={styles.heroKicker}>MENTÉS · ELEMZÉS · RENDSZEREZÉS</span>
        <h1>
          <span>Gasztro videóból</span>
          <span className={styles.heroAccent}>rendszerezett tudás.</span>
        </h1>
        <p>Facebook, Instagram, TikTok és YouTube videókból automatikusan receptet, technológiát, tálalási ötleteket és kereshető katalógusadatokat készít.</p>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionLabel}>⌁ <span>Forrás kiválasztása</span></div>
        <div className={styles.sourceRow}>
          {sources.map((item) => (
            <button
              key={item.key}
              type="button"
              className={source === item.key ? styles.sourceActive : styles.sourceButton}
              onClick={() => {
                setSource(item.key);
                setError("");
              }}
            >
              <span className={`${styles.sourceBadge} ${styles["sourceBadge_" + item.key]}`}>
                <PlatformIcon source={item.key} />
              </span>
              {item.label}
            </button>
          ))}
        </div>

        {source === "auto" && detectedSource && url.trim() ? (
          <small className={styles.detectedSource}>Felismerve: {sources.find((item) => item.key === detectedSource)?.label}</small>
        ) : null}

        <label className={styles.fieldLabel}>Videó linkje</label>
        <div className={styles.urlField}>
          <span className={styles.linkGlyph}>⌁</span>
          <input
            className={styles.urlInput}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={() => setAction("both")}
            placeholder={sourceConfig.placeholder}
            spellCheck={false}
          />
          {url ? (
            <button type="button" className={styles.clearButton} onClick={() => setUrl("")} aria-label="Link törlése">×</button>
          ) : null}
        </div>

        <div className={styles.fieldLabel}>Mit szeretnél tenni?</div>
        <div className={styles.actionGrid}>
          {actions.map((item) => (
            <button
              key={item.key}
              type="button"
              className={action === item.key ? styles.actionActive : styles.action}
              onClick={() => setAction(item.key)}
            >
              <div className={styles.actionTop}>
                <span className={styles.actionIcon}>{item.icon}</span>
                <span className={styles.actionRadio}>{action === item.key ? <i /> : null}</span>
              </div>
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </button>
          ))}
        </div>

        {action !== "download" && (
          <div className={styles.focusWrap}>
            <div className={styles.fieldLabel}>Mit keressek?</div>
            <div className={styles.focusRow}>
              {focuses.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={focus === item.key ? styles.focusActive : styles.focus}
                  onClick={() => setFocus(item.key)}
                >
                  <span className={styles.focusIcon} style={{ color: item.color }}>{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button className={styles.run} type="button" disabled={!canRun} onClick={run}>
          <span>✦</span>
          <strong>{busy ? "Dolgozom…" : action === "download" ? "Videó mentése" : action === "extract" ? "Kinyerés indítása" : "Kinyerés + mentés"}</strong>
          <span>→</span>
        </button>

        {status && <div className={styles.status}>{status}</div>}
        {error && <div className={styles.error}>{error}</div>}
        {error && detectedSource === "facebook" && (
          <div style={{marginTop:12,display:"grid",gap:8}}>
            <p style={{fontSize:13,color:"#cbd5e1"}}>A Facebook nem engedte a videó kinyerését. A linket ettől még megőrizheted a gyűjteményben.</p>
            <button type="button" disabled={saving} onClick={() => void saveUnprocessedLink()} className={styles.run}>
              <span>▤</span><strong>{saving ? "Mentés..." : "Facebook-link mentése feldolgozásra váróként"}</strong><span>→</span>
            </button>
          </div>
        )}
        <p className={styles.note}>Csak publikus tartalom. Facebook-jelszót vagy belépési cookie-t nem kérünk és nem tárolunk.</p>
      </section>

      {result && (
        <section className={styles.results}>
          <div className={styles.resultTopbar}>
            <span>▣ &nbsp; Feldolgozott eredmény</span>
            <Link href="/mota-import/gyujtemeny">Gyűjtemény →</Link>
          </div>

          <div className={styles.resultHero}>
            <ResultThumbnail url={result.thumbnail_url||""}/>
            <div className={styles.resultIntro}>
              <span>{result.platform}{result.uploader ? ` · ${result.uploader}` : ""}</span>
              <h2>{result.title}</h2>
              {result.hungarian_summary ? <p>{result.hungarian_summary}</p> : null}
              <div className={styles.catalogTags}>
                {result.recipe_group ? <b>{result.recipe_group}</b> : null}
                {(result.ingredient_tags || []).slice(0, 3).map((t) => <b key={"i-"+t}>{t}</b>)}
                {(result.content_tags || []).slice(0, 3).map((t) => <b key={"c-"+t}>{t}</b>)}
              </div>
              {result.tags?.length ? <div className={styles.tags}>{result.tags.slice(0, 4).map((t) => <b key={t}>{t}</b>)}</div> : null}
            </div>
          </div>

          <div className={styles.saveBar}>
            <button type="button" className={styles.saveButton} onClick={() => void saveResult()} disabled={saving}>
              {saving ? "Mentés…" : saved ? "✓ Elmentve" : "Mentés a gyűjteménybe"}
            </button>
            <Link href="/mota-import/gyujtemeny" className={styles.openLibrary}>Gyűjtemény megnyitása →</Link>
          </div>

          {result.ingredients?.length ? (
            <section className={styles.resultBlock}>
              <h3>Hozzávalók</h3>
              <div className={styles.ingredients}>
                {result.ingredients.map((x, i) => (
                  <div key={i}>
                    <b>{x.amount || "—"}</b>
                    <span>{x.name}</span>
                    {x.note ? <small>{x.note}</small> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <List title="Elkészítés" items={result.method_steps} />
          <List title="Technológia" items={result.techniques} />
          <List title="Tálalás" items={result.plating} />
          <List title="Eszközök" items={result.equipment} />
          <List title="Séftippek" items={result.chef_tips} />
          <List title="Versenyen használható ötletek" items={result.competition_ideas} />

          {result.hungarian_translation && (
            <section className={styles.resultBlock}>
              <h3>Magyar fordítás</h3>
              <p className={styles.longText}>{result.hungarian_translation}</p>
            </section>
          )}

          {result.original_transcript && (
            <details className={styles.transcript}>
              <summary>Eredeti szöveg / transcript</summary>
              <p>{result.original_transcript}</p>
            </details>
          )}

          <div className={styles.saveBarBottom}>
            <button type="button" className={styles.saveButton} onClick={() => void saveResult()} disabled={saving}>
              {saving ? "Mentés…" : saved ? "✓ Elmentve a gyűjteménybe" : "Mentés a gyűjteménybe"}
            </button>
          </div>
        </section>
      )}

      <footer className={styles.footer}>MOTA Import v0.6.1</footer>
    </main>
  );
}
