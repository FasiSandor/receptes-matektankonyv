"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createLibraryVideoUrl,
  restoreLibraryItemIfMissing,
  deleteLibraryItem,
  getLibraryKey,
  LibraryItem,
  LibraryStatus,
  listLibraryItems,
  setLibraryKey,
  updateLibraryItem,
} from "../library";
import styles from "./Collection.module.css";
import { createLibraryBackup, parseLibraryBackup, type LibraryBackup } from "../library-backup";

type Filter = "all" | "favorite" | "competition" | "to_try" | "tested";

const filterLabels: { key: Filter; label: string; icon: string }[] = [
  { key: "all", label: "Mind", icon: "☷" },
  { key: "favorite", label: "Kedvenc", icon: "★" },
  { key: "competition", label: "Versenyre", icon: "♜" },
  { key: "to_try", label: "Kipróbálandó", icon: "◷" },
  { key: "tested", label: "Kipróbált", icon: "✓" },
];

const statusLabels: Record<LibraryStatus, string> = {
  saved: "Mentett",
  to_try: "Kipróbálandó",
  tested: "Kipróbált",
};

const groupOrder = [
  "Előétel",
  "Leves",
  "Főétel",
  "Tányérdesszert",
  "Kiegészítő elem",
  "Mártás/krém",
  "Köret",
  "Tészta/Pékáru",
  "Ital",
  "Egyéb",
] as const;

const groupShort: Record<string, string> = {
  "Előétel": "E",
  "Leves": "L",
  "Főétel": "F",
  "Tányérdesszert": "D",
  "Kiegészítő elem": "K",
  "Mártás/krém": "M",
  "Köret": "Kö",
  "Tészta/Pékáru": "T",
  "Ital": "I",
  "Egyéb": "·",
};

function groupId(group: string) {
  return "group-" + group
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function DetailList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <section className={styles.detailSection}>
      <h4>{title}</h4>
      <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </section>
  );
}

function stableVideoThumbnail(url:string):string {
 try {
  const u=new URL(url);
  const host=u.hostname.toLowerCase();
  let id="";
  if(host==="youtu.be"||host.endsWith(".youtu.be")) id=u.pathname.split("/")[1]||"";
  else if(host==="youtube.com"||host.endsWith(".youtube.com")) id=u.searchParams.get("v")||(u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1]||"");
  if(/^[a-zA-Z0-9_-]{11}$/.test(id))return "https://i.ytimg.com/vi/"+id+"/hqdefault.jpg";
 }catch{}
 return "";
}
function LibraryMedia({ item }: { item: LibraryItem }) {
  const [videoUrl, setVideoUrl] = useState("");
  const [imageStage, setImageStage] = useState(0);
  const stableThumb = stableVideoThumbnail(item.source_url);
  const thumb = imageStage===0 ? (item.thumbnail_url || stableThumb) : imageStage===1 && stableThumb && stableThumb!==item.thumbnail_url ? stableThumb : "";
  useEffect(()=>setImageStage(0),[item.id,item.thumbnail_url]);

  useEffect(() => {
    let active = true;
    if (!item.video_path) return;

    void createLibraryVideoUrl(item.video_path).then((url) => {
      if (active) setVideoUrl(url);
    });

    return () => { active = false; };
  }, [item.video_path]);

  if (item.video_path && videoUrl) {
    return (
      <video
        className={styles.videoPreview}
        src={videoUrl}
        poster={thumb || undefined}
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  if (thumb) {
    return <a href={item.source_url} target="_blank" rel="noopener noreferrer" title="Videó megnyitása"><img className={styles.thumb} src={thumb} alt={item.title} referrerPolicy="no-referrer" onError={() => setImageStage(x=>Math.min(2,x+1))} /></a>;
  }

  return <a href={item.source_url} target="_blank" rel="noopener noreferrer" className={styles.thumbPlaceholder} title="Videó megnyitása az eredeti oldalon" style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,textDecoration:"none",color:"#bcaaff"}} aria-label="Videó lejátszása a forrásoldalon">▶</a>;
}


export default function CollectionPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [ingredientFilter, setIngredientFilter] = useState("all");
  const [contentFilter, setContentFilter] = useState("all");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [sourceQuery, setSourceQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showTop, setShowTop] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickUrl, setQuickUrl] = useState("");
  const [restorePreview,setRestorePreview] = useState<LibraryBackup|null>(null);
  const [restoreBusy,setRestoreBusy] = useState(false);
  const [inspectBusy,setInspectBusy] = useState(false);
  const [restoreProgress,setRestoreProgress] = useState(0);
  const [backupBusy,setBackupBusy] = useState(false);
  const [restoreExisting,setRestoreExisting] = useState(0);
  const [restoreErrors,setRestoreErrors] = useState<string[]>([]);
  const [restoreFailedEntries,setRestoreFailedEntries] = useState<LibraryBackup["items"]>([]);
  const [restoreSummary,setRestoreSummary] = useState<{added:number;skipped:number;failed:number;pending:number}|null>(null);

  async function reload() {
    try {
      setLoading(true);
      setItems(await listLibraryItems());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A gyűjtemény nem tölthető be.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const sourcePages = useMemo(() => {
    const map = new Map<string, { key: string; name: string; url: string; platform: string; count: number }>();
    for (const item of items) {
      const name = item.source_page_name || item.uploader || "";
      const generic = /^(unknown|ismeretlen|chef)$/i.test(name.trim());
      if (!name || (generic && !item.source_page_url)) continue;
      const url = item.source_page_url || "";
      const key = url || `${item.platform || "Forrás"}::${name}`;
      const current = map.get(key);
      if (current) current.count += 1;
      else map.set(key, { key, name, url, platform: item.platform || "Forrás", count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "hu"));
  }, [items]);

  const catalogFacets = useMemo(() => {
    const ingredientCounts = new Map<string, number>();
    const contentCounts = new Map<string, number>();
    const groupCounts = new Map<string, number>();

    for (const item of items) {
      const group = item.recipe_group || "Egyéb";
      groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
      for (const tag of item.ingredient_tags || []) {
        ingredientCounts.set(tag, (ingredientCounts.get(tag) || 0) + 1);
      }
      for (const tag of item.content_tags || []) {
        contentCounts.set(tag, (contentCounts.get(tag) || 0) + 1);
      }
    }

    const sortCounts = (map: Map<string, number>) =>
      Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "hu"));

    return {
      groups: groupOrder.filter((group) => groupCounts.has(group)).map((group) => [group, groupCounts.get(group)!] as const),
      ingredients: sortCounts(ingredientCounts),
      contents: sortCounts(contentCounts),
    };
  }, [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("hu");
    return items.filter((item) => {
      if (sourceFilter !== "all") {
        const itemKey = item.source_page_url || `${item.platform || "Forrás"}::${item.source_page_name || item.uploader || ""}`;
        if (itemKey !== sourceFilter) return false;
      }
      if (groupFilter !== "all" && (item.recipe_group || "Egyéb") !== groupFilter) return false;
      if (ingredientFilter !== "all" && !(item.ingredient_tags || []).includes(ingredientFilter)) return false;
      if (contentFilter !== "all" && !(item.content_tags || []).includes(contentFilter)) return false;
      if (filter === "favorite" && !item.favorite) return false;
      if (filter === "competition" && !item.for_competition) return false;
      if (filter === "to_try" && item.status !== "to_try") return false;
      if (filter === "tested" && item.status !== "tested") return false;
      if (!needle) return true;

      const haystack = [
        item.title,
        item.uploader,
        item.hungarian_summary,
        item.note,
        item.recipe_group || "",
        ...(item.ingredient_tags || []),
        ...(item.content_tags || []),
        ...(item.tags || []),
        ...(item.techniques || []),
        ...(item.competition_ideas || []),
      ].join(" ").toLocaleLowerCase("hu");
      return haystack.includes(needle);
    });
  }, [items, query, filter, sourceFilter, groupFilter, ingredientFilter, contentFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, LibraryItem[]>();
    for (const item of visible) {
      const group = item.recipe_group || "Egyéb";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(item);
    }

    const known = groupOrder
      .filter((group) => map.has(group))
      .map((group) => ({ group, items: map.get(group)! }));

    const extras = Array.from(map.entries())
      .filter(([group]) => !groupOrder.includes(group as typeof groupOrder[number]))
      .map(([group, groupItems]) => ({ group, items: groupItems }));

    return [...known, ...extras];
  }, [visible]);

  async function patch(id: string, values: Parameters<typeof updateLibraryItem>[1]) {
    try {
      const updated = await updateLibraryItem(id, values);
      setItems((current) => current.map((item) => item.id === id ? updated : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A módosítás nem sikerült.");
    }
  }

  async function replaceCover(id: string, file: File) {
    if (!file.type.startsWith("image/")) { setMessage("Válassz egy képfájlt."); return; }
    if (file.size > 12 * 1024 * 1024) { setMessage("A kép legfeljebb 12 MB lehet."); return; }
    let objectUrl = "";
    try {
      objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 420 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("A kép nem dolgozható fel.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const cover = canvas.toDataURL("image/jpeg", 0.68);
      if (cover.length > 150000) throw new Error("A kép mentéshez túl nagy.");
      const updated = await updateLibraryItem(id, { thumbnail_url: cover });
      setItems(current => current.map(item => item.id === id ? updated : item));
      setMessage("Borítókép frissítve. A recept és a videólink változatlan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A borítókép mentése nem sikerült.");
    } finally { if (objectUrl) URL.revokeObjectURL(objectUrl); }
  }

  async function remove(item: LibraryItem) {
    if (!confirm(`Törlöd a gyűjteményből?\n\n${item.title}`)) return;
    try {
      await deleteLibraryItem(item.id, item.video_path);
      setItems((current) => current.filter((x) => x.id !== item.id));
      if (expanded === item.id) setExpanded(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A törlés nem sikerült.");
    }
  }

  async function downloadBackup() {
    if(backupBusy)return;
    setBackupBusy(true);
    try {
      const allItems=await listLibraryItems();
      const data=createLibraryBackup(allItems);
      const json=JSON.stringify(data,null,2);
      parseLibraryBackup(json);
      const blob=new Blob([json],{type:"application/json"});
      if(blob.size>50_000_000)throw Error("A biztonsági mentés meghaladja az 50 MB-os visszaállítási korlátot.");
      const href=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=href;
      a.download="tudaskonyvtar-gyujtemeny-"+new Date().toISOString().slice(0,10)+".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(href),1000);
      setMessage(data.item_count+" elem biztonsági mentése elkészült. A videófájlok nem részei a JSON mentésnek.");
    } catch(error) {
      setMessage(error instanceof Error?error.message:"A mentés nem sikerült.");
    }finally{setBackupBusy(false);}
  }

  const backupInspectionSequence = useRef(0);
  const restoreStopRequested = useRef(false);
  const [restoreStopping,setRestoreStopping] = useState(false);

  async function inspectBackup(file:File) {
    if(restoreBusy)return;
    const inspection=++backupInspectionSequence.current;
    setInspectBusy(true);
    setRestorePreview(null);
    setRestoreProgress(0);
    setRestoreErrors([]);
    setRestoreFailedEntries([]);
    setRestoreSummary(null);
    if(file.size>50_000_000){setMessage("A mentés túl nagy.");setInspectBusy(false);return;}
    try{
      const parsed=parseLibraryBackup(await file.text());
      const current=await listLibraryItems();
      if(inspection!==backupInspectionSequence.current)return;
      const urls=new Set(current.map(item=>item.source_url));
      setRestoreExisting(parsed.items.filter(entry=>urls.has(entry.source_url)).length);
      setRestorePreview(parsed);
      setMessage("Mentés ellenőrizve: "+parsed.item_count+" elem. Még semmi nem lett visszaállítva.");
    }catch(error){if(inspection===backupInspectionSequence.current)setMessage(error instanceof Error?error.message:"A mentés nem olvasható.");}
    finally{if(inspection===backupInspectionSequence.current)setInspectBusy(false);}
  }

  async function restoreBackup() {
    if(!restorePreview||restoreBusy)return;
    if(!confirm("Hozzáadod a mentésből a hiányzó elemeket? A meglévő rekordokat változatlanul hagyjuk. A videófájlok nem állnak vissza."))return;
    backupInspectionSequence.current++;
    setInspectBusy(false);
    restoreStopRequested.current=false;
    setRestoreStopping(false);
    setRestoreBusy(true);
    setRestoreProgress(0);
    setRestoreErrors([]);
    setRestoreFailedEntries([]);
    setRestoreSummary(null);
    let added=0;
    let skipped=0;
    const failed:string[]=[];
    const failedEntries:LibraryBackup["items"]=[];
    let stopped=false;
    try{
      for(const [index,entry] of restorePreview.items.entries()){
        if(restoreStopRequested.current){stopped=true;failedEntries.push(...restorePreview.items.slice(index));break;}
        try{
          const saved=await restoreLibraryItemIfMissing(entry.result,{favorite:entry.favorite,for_competition:entry.for_competition,status:entry.status,note:entry.note,tags:entry.tags});
          if(saved)added++;
          else skipped++;
        }catch(error){
          failed.push(entry.result.title+" ("+(error instanceof Error?error.message:"hiba")+")");
          failedEntries.push(entry);
        }
        setRestoreProgress(index+1);
      }
      setRestoreErrors(failed);
      setRestoreFailedEntries(failedEntries);
      setRestoreSummary({added,skipped,failed:failed.length,pending:stopped?failedEntries.length-failed.length:0});
      if(!failed.length&&!stopped)setRestorePreview(null);
      setMessage((stopped?"Megszakítva. A már hozzáadott elemek megmaradnak. A feldolgozatlan elemek újrapróbálhatók. ":"")+added+" új elem hozzáadva, "+skipped+" meglévő elem kihagyva, "+failed.length+" hiba."+(failed.length?" Sikertelen: "+failed.slice(0,5).join("; "):""));
    }finally{
      setRestoreBusy(false);
      setRestoreStopping(false);
      try{await reload();}catch(error){setMessage("A visszaállítás befejeződött, de a lista frissítése nem sikerült: "+String(error));}
    }
  }

  async function copyKey() {
    const key = getLibraryKey();
    await navigator.clipboard.writeText(key);
    setMessage("A gyűjteménykulcs a vágólapra került. Ezt csak a saját eszközödre másold át.");
  }

  function importKey() {
    const next = prompt("Illeszd be a másik eszköz MOTA Import gyűjteménykulcsát:");
    if (!next) return;
    try {
      setLibraryKey(next);
      location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A kulcs nem használható.");
    }
  }

  function jumpToGroup(group: string) {
    document.getElementById(groupId(group))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function submitQuickImport() {
    const value = quickUrl.trim();
    if (!/^https?:\/\//i.test(value)) {
      setMessage("Illessz be egy érvényes Facebook, Instagram, TikTok vagy YouTube linket.");
      return;
    }
    window.location.href = `/mota-import?url=${encodeURIComponent(value)}&quick=1`;
  }

  async function pasteQuickLink() {
    try {
      const value = await navigator.clipboard.readText();
      if (value) setQuickUrl(value.trim());
    } catch {
      setMessage("A vágólap olvasását az iPhone most nem engedte. Illeszd be kézzel a linket.");
    }
  }

  return (
    <main className={styles.shell}><a href="/" style={{display:"inline-block",color:"#b2a0ff",padding:"5px 0 12px",textDecoration:"none",fontSize:13,fontWeight:700}}>← Receptes és Matektankönyv</a>
      <header className={styles.topbar}>
        <Link href="/mota-import" className={styles.brand}>
          <img src="https://recept-ai-phi.vercel.app/mota-import/icon-180.png" alt="" className={styles.brandIcon} />
          <span className={styles.brandText}>
            <strong>MOTA Import</strong>
            <small>Gasztro videó-katalógus & tudástár</small>
          </span>
        </Link>
        <Link href="/mota-import" className={styles.importLink}>
          <span>＋</span>
          <b>Új import</b>
        </Link>
      </header>

      <section className={styles.hero}>
        <span className={styles.kicker}>RENDSZEREZETT GASZTRO TUDÁSTÁR</span>
        <h1>Gyűjtemény</h1>
        <p>{items.length} mentett szakmai anyag · kereshető videók, receptek és technológiák</p>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span>⌕</span>
          <input
            className={styles.search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Keresés: hal, ropogós elem, csokoládé…"
          />
        </div>

        <div className={styles.filters}>
          {filterLabels.map((item) => (
            <button
              key={item.key}
              type="button"
              className={filter === item.key ? styles.filterActive : styles.filter}
              onClick={() => setFilter(item.key)}
            >
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      </section>

      <div style={{padding:"0 16px 12px"}}><button type="button" className={styles.catalogTool} onClick={()=>void downloadBackup()} disabled={loading||backupBusy}>{backupBusy?"Mentés előkészítése…":"↓ Gyűjtemény biztonsági mentése (JSON)"}</button></div>

      <section className={styles.catalogTools}>
        <button type="button" className={sourceFilter !== "all" ? styles.catalogToolActive : styles.catalogTool} onClick={() => setSourceOpen(true)}>
          <span className={styles.catalogToolIcon}>◎</span>
          <span><b>Források</b><small>{sourcePages.length} oldal / profil</small></span>
          <i>›</i>
        </button>
        <button type="button" className={(groupFilter !== "all" || ingredientFilter !== "all" || contentFilter !== "all") ? styles.catalogToolActive : styles.catalogTool} onClick={() => setCatalogOpen(true)}>
          <span className={styles.catalogToolIcon}>▦</span>
          <span><b>Katalógus</b><small>Fogás · alapanyag · elem</small></span>
          <i>›</i>
        </button>
      </section>

      {(sourceFilter !== "all" || groupFilter !== "all" || ingredientFilter !== "all" || contentFilter !== "all") ? (
        <div className={styles.activeFilters}>
          {sourceFilter !== "all" ? <button type="button" onClick={() => setSourceFilter("all")}>Forrás ×</button> : null}
          {groupFilter !== "all" ? <button type="button" onClick={() => setGroupFilter("all")}>{groupFilter} ×</button> : null}
          {ingredientFilter !== "all" ? <button type="button" onClick={() => setIngredientFilter("all")}>{ingredientFilter} ×</button> : null}
          {contentFilter !== "all" ? <button type="button" onClick={() => setContentFilter("all")}>{contentFilter} ×</button> : null}
        </div>
      ) : null}

      {message && (
        <button type="button" className={styles.message} onClick={() => setMessage("")}>
          {message}
        </button>
      )}

      {loading ? (
        <section className={styles.empty}>Gyűjtemény betöltése…</section>
      ) : visible.length === 0 ? (
        <section className={styles.empty}>
          <strong>{items.length ? "Nincs találat." : "Még nincs elmentett anyag."}</strong>
          <span>Dolgozz fel egy videót, majd mentsd el a gyűjteménybe.</span>
        </section>
      ) : (
        <section className={styles.groupList}>
          {grouped.map(({ group, items: groupItems }) => (
            <section key={group} id={groupId(group)} className={styles.groupSection}>
              <div className={styles.groupHeader}>
                <div>
                  <span>{groupShort[group] || "•"}</span>
                  <h2>{group}</h2>
                </div>
                <b>{groupItems.length}</b>
              </div>

              <div className={styles.grid}>
                {groupItems.map((item) => {
                  const open = expanded === item.id;
                  return (
                    <article key={item.id} className={styles.card}>
                      <div className={styles.cardMain}>
                        <LibraryMedia item={item} />

                        <button
                          type="button"
                          className={styles.cardTextButton}
                          onClick={() => setExpanded(open ? null : item.id)}
                        >
                          <div className={styles.cardText}>
                            <h2>{item.title}</h2>
                            <div className={styles.meta}>
                              <span className={styles.platformDot}>●</span>
                              <b>{item.platform || "Forrás"}</b>
                              {(item.source_page_name || item.uploader) ? (
                                item.source_page_url ? (
                                  <a
                                    href={item.source_page_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    · {item.source_page_name || item.uploader} ↗
                                  </a>
                                ) : (
                                  <span>· {item.source_page_name || item.uploader}</span>
                                )
                              ) : null}
                            </div>
                            <p>{item.hungarian_summary || "Mentett szakmai videó"}</p>

                            <div className={styles.catalogTagRow}>
                              <b className={styles.groupTag}>{item.recipe_group || "Egyéb"}</b>
                              {(item.ingredient_tags || []).slice(0, 2).map((tag) => <b key={"i-"+tag} className={styles.ingredientTag}>{tag}</b>)}
                              {(item.content_tags || []).slice(0, 2).map((tag) => <b key={"c-"+tag} className={styles.contentTag}>{tag}</b>)}
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          className={styles.moreButton}
                          onClick={() => setExpanded(open ? null : item.id)}
                          aria-label={open ? "Bezárás" : "Megnyitás"}
                        >
                          {open ? "⌃" : "⋮"}
                        </button>
                      </div>

                      <div className={styles.quickActions}>
                        <button
                          type="button"
                          className={item.favorite ? styles.quickActive : styles.quick}
                          onClick={() => void patch(item.id, { favorite: !item.favorite })}
                        >☆ <span>Kedvenc</span></button>
                        <button
                          type="button"
                          className={item.for_competition ? styles.quickActive : styles.quick}
                          onClick={() => void patch(item.id, { for_competition: !item.for_competition })}
                        >♜ <span>Versenyre</span></button>
                        <button
                          type="button"
                          className={item.status === "to_try" ? styles.quickActive : styles.quick}
                          onClick={() => void patch(item.id, { status: item.status === "to_try" ? "saved" : "to_try" })}
                        >◷ <span>Kipróbálandó</span></button>
                      </div>

                      {open && (
                        <div className={styles.details}>
                          <div className={styles.statusButtons}>
                            {(["saved", "to_try", "tested"] as LibraryStatus[]).map((status) => (
                              <button
                                key={status}
                                type="button"
                                className={item.status === status ? styles.statusActive : styles.statusButton}
                                onClick={() => void patch(item.id, { status })}
                              >
                                {statusLabels[status]}
                              </button>
                            ))}
                          </div>

                          <div style={{margin:"12px 0",padding:"12px",border:"1px solid #51407b",borderRadius:12}}>
                            <label style={{display:"block",fontWeight:700,marginBottom:7}}>Borítókép pótlása</label>
                            <small style={{display:"block",marginBottom:8}}>A telefonodról választott kép tartósan a gyűjteményelemhez kerül, a recept nem változik.</small>
                            <input type="file" accept="image/*" aria-label="Borítókép kiválasztása" style={{maxWidth:"100%"}} onChange={event => { const file=event.target.files?.[0]; if(file)void replaceCover(item.id,file); event.target.value=""; }} />
                          </div>
                          {(item.ingredients?.length || item.method_steps?.length) ? (
                            <div style={{margin:"12px 0",padding:14,border:"1px solid #3b82f6",borderRadius:12,background:"#162441"}}>
                              <strong style={{display:"block",marginBottom:7}}>Recepttár</strong>
                              <p style={{fontSize:13,margin:"0 0 10px",color:"#b8c9ed"}}>A feldolgozott eredeti forrás megmarad, a recept jóváhagyottként külön megjelenik a Recepttárban.</p>
                              <button type="button" className={styles.statusActive} onClick={() => void patch(item.id,{tags:(item.tags||[]).includes("recepttar:approved")?(item.tags||[]).filter(t=>t!=="recepttar:approved"):[...(item.tags||[]),"recepttar:approved"]})}>
                                {(item.tags||[]).includes("recepttar:approved")?"↩ Vissza a Forrástárba":"✓ Áthelyezés a Recepttárba"}
                              </button>
                              <Link href="/recepttar" style={{marginLeft:12,color:"#93c5fd",fontWeight:700}}>Recepttár →</Link>
                            </div>
                          ) : null}
                          {item.ingredients?.length ? (
                            <section className={styles.detailSection}>
                              <h4>Hozzávalók</h4>
                              <div className={styles.ingredients}>
                                {item.ingredients.map((x, i) => (
                                  <div key={i}>
                                    <b>{x.amount || "—"}</b>
                                    <span>{x.name}</span>
                                    {x.note ? <small>{x.note}</small> : null}
                                  </div>
                                ))}
                              </div>
                            </section>
                          ) : null}

                          <DetailList title="Elkészítés" items={item.method_steps} />
                          <DetailList title="Technológia" items={item.techniques} />
                          <DetailList title="Tálalás" items={item.plating} />
                          <DetailList title="Séftippek" items={item.chef_tips} />
                          <DetailList title="Versenyötletek" items={item.competition_ideas} />

                          <section className={styles.detailSection}>
                            <h4>Saját megjegyzés</h4>
                            <textarea
                              className={styles.note}
                              defaultValue={item.note}
                              placeholder="Mit próbálnál ki belőle? Melyik versenyhez jó?"
                              onBlur={(e) => void patch(item.id, { note: e.target.value })}
                            />
                          </section>

                          <div className={styles.bottomActions}>
                            <a href={item.source_url} target="_blank" rel="noopener noreferrer">{item.platform.toLowerCase().includes("facebook") ? "▶ Videó lejátszása a Facebookon ↗" : "▶ Videó megnyitása a forrásoldalon ↗"}</a>
                            <Link href={`/mota-import?url=${encodeURIComponent(item.source_url)}`}>✦ Újraelemzés / videófeltöltés</Link>
                            <button type="button" onClick={() => void remove(item)}>Törlés</button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </section>
      )}

      {grouped.length > 1 ? (
        <nav className={styles.groupRail} aria-label="Gyors navigáció">
          {grouped.map(({ group }) => (
            <button key={group} type="button" onClick={() => jumpToGroup(group)} title={group}>
              {groupShort[group] || "•"}
            </button>
          ))}
        </nav>
      ) : null}

      {sourceOpen ? (
        <div className={styles.drawerOverlay} onClick={() => setSourceOpen(false)}>
          <section className={styles.drawer} onClick={(event) => event.stopPropagation()}>
            <div className={styles.drawerHead}>
              <div><span>FORRÁSKÖNYVTÁR</span><h3>Mentett oldalak és profilok</h3></div>
              <button type="button" onClick={() => setSourceOpen(false)}>×</button>
            </div>
            <input
              className={styles.drawerSearch}
              type="search"
              value={sourceQuery}
              onChange={(event) => setSourceQuery(event.target.value)}
              placeholder="Keresés oldalra, profilra…"
            />
            <div className={styles.sourceGrid}>
              {sourcePages
                .filter((source) => !sourceQuery.trim() || `${source.name} ${source.platform}`.toLocaleLowerCase("hu").includes(sourceQuery.trim().toLocaleLowerCase("hu")))
                .map((source) => (
                  <div key={source.key} className={sourceFilter === source.key ? styles.sourceTileActive : styles.sourceTile}>
                    <button type="button" onClick={() => { setSourceFilter(source.key); setSourceOpen(false); }}>
                      <span>{source.platform}</span>
                      <strong>{source.name}</strong>
                      <small>{source.count} mentett videó</small>
                    </button>
                    {source.url ? <a href={source.url} target="_blank" rel="noreferrer">↗</a> : null}
                  </div>
                ))}
            </div>
            {sourceFilter !== "all" ? <button type="button" className={styles.clearDrawerFilter} onClick={() => { setSourceFilter("all"); setSourceOpen(false); }}>Összes forrás mutatása</button> : null}
          </section>
        </div>
      ) : null}

      {catalogOpen ? (
        <div className={styles.drawerOverlay} onClick={() => setCatalogOpen(false)}>
          <section className={styles.drawer} onClick={(event) => event.stopPropagation()}>
            <div className={styles.drawerHead}>
              <div><span>KATALÓGUS SZŰRŐK</span><h3>Mi érdekel?</h3></div>
              <button type="button" onClick={() => setCatalogOpen(false)}>×</button>
            </div>

            <div className={styles.facetSection}>
              <h4>Fogástípus</h4>
              <div className={styles.facetGrid}>
                {catalogFacets.groups.map(([name,count]) => (
                  <button key={name} type="button" className={groupFilter===name ? styles.facetActive : styles.facet} onClick={() => setGroupFilter(groupFilter===name ? "all" : name)}>
                    <span>{name}</span><b>{count}</b>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.facetSection}>
              <h4>Fő alapanyag</h4>
              <div className={styles.facetGrid}>
                {catalogFacets.ingredients.map(([name,count]) => (
                  <button key={name} type="button" className={ingredientFilter===name ? styles.facetActive : styles.facet} onClick={() => setIngredientFilter(ingredientFilter===name ? "all" : name)}>
                    <span>{name}</span><b>{count}</b>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.facetSection}>
              <h4>Elem / technika</h4>
              <div className={styles.facetGrid}>
                {catalogFacets.contents.map(([name,count]) => (
                  <button key={name} type="button" className={contentFilter===name ? styles.facetActive : styles.facet} onClick={() => setContentFilter(contentFilter===name ? "all" : name)}>
                    <span>{name}</span><b>{count}</b>
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className={styles.applyFilters} onClick={() => setCatalogOpen(false)}>Találatok mutatása</button>
          </section>
        </div>
      ) : null}

      <div className={styles.floatingStack}>
        {showTop ? (
          <button
            type="button"
            className={styles.topButton}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Lap tetejére"
          >
            ↑
          </button>
        ) : null}
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setQuickOpen(true)}
          aria-label="Új link"
        >
          ＋
        </button>
      </div>

      {quickOpen ? (
        <div className={styles.quickOverlay} onClick={() => setQuickOpen(false)}>
          <section className={styles.quickSheet} onClick={(event) => event.stopPropagation()}>
            <div className={styles.quickSheetHead}>
              <div>
                <span>GYORS IMPORT</span>
                <h3>Következő videó</h3>
              </div>
              <button type="button" onClick={() => setQuickOpen(false)}>×</button>
            </div>
            <p>Illeszd be a következő Facebook, Instagram, TikTok vagy YouTube linket. A MOTA Import automatikusan „Mindkettő” módra áll.</p>
            <div className={styles.quickInputRow}>
              <input
                autoFocus
                type="url"
                value={quickUrl}
                onChange={(event) => setQuickUrl(event.target.value)}
                placeholder="https://…"
              />
              <button type="button" onClick={() => void pasteQuickLink()}>Beillesztés</button>
            </div>
            <button type="button" className={styles.quickGo} onClick={submitQuickImport}>
              Tovább a feldolgozáshoz →
            </button>
          </section>
        </div>
      ) : null}

      {restoreFailedEntries.length>0&&!restoreBusy&&<button type="button" onClick={()=>{setRestorePreview(previous=>previous?{...previous,items:restoreFailedEntries,item_count:restoreFailedEntries.length}:null);setRestoreExisting(0);setRestoreFailedEntries([]);setRestoreErrors([]);setRestoreSummary(null);setMessage("A sikertelen elemek újrapróbálásra előkészítve. Jóváhagyás után indul a visszaállítás.");}}>A {restoreFailedEntries.length} sikertelen vagy feldolgozatlan elem folytatása</button>}

      {restoreSummary&&<section aria-label="Visszaállítás eredménye"><p role="status">Visszaállítás eredménye: {restoreSummary.added} új, {restoreSummary.skipped} kihagyott, {restoreSummary.failed} hibás, {restoreSummary.pending} feldolgozatlan elem.</p>{restoreErrors.length>0&&<details><summary>Hibás elemek részletei ({restoreErrors.length})</summary><ul>{restoreErrors.map((error,index)=><li key={index}>{error}</li>)}</ul></details>}</section>}

      <section className={styles.device}>
        <div style={{padding:16,display:"grid",gap:10}}>
          <strong>Biztonsági mentés visszaállítása</strong>
          <small>Először ellenőrizzük a JSON fájlt. Az adatok csak a jóváhagyásod után kerülnek a gyűjteménybe. A meglévő rekordokat változatlanul hagyjuk; csak a hiányzó elemeket adjuk hozzá.</small>
          <input type="file" disabled={restoreBusy} accept=".json,application/json" aria-label="Gyűjtemény biztonsági mentés kiválasztása" onChange={e=>{const file=e.target.files?.[0];if(file)void inspectBackup(file);e.target.value="";}}/>
          {inspectBusy&&<p role="status">A mentési fájl ellenőrzése és a meglévő receptek összehasonlítása folyamatban…</p>}
          {restorePreview&&<div><p>{restorePreview.item_count} ellenőrzött elem · {restorePreview.exported_at}</p><p>{restoreExisting} meglévő elem kihagyva, {restorePreview.item_count-restoreExisting} új elem kerülhet be.</p>{restoreBusy&&<p role="status">Visszaállítás: {restoreProgress}/{restorePreview.item_count}{restoreStopping?" · Megszakítás a jelenlegi elem után…":""}</p>}{restoreBusy&&<button type="button" disabled={restoreStopping} onClick={()=>{restoreStopRequested.current=true;setRestoreStopping(true);}}>Visszaállítás megszakítása</button>}<button type="button" disabled={restoreBusy||inspectBusy} onClick={()=>void restoreBackup()}>{restoreBusy?"Visszaállítás folyamatban…":"Jóváhagyás és visszaállítás"}</button><button type="button" disabled={restoreBusy} onClick={()=>setRestorePreview(null)}>Mégse</button></div>}
        </div>
      </section>

      <section className={styles.device}>
        <div className={styles.deviceIntro}>
          <div className={styles.deviceIcon}>▣</div>
          <div>
            <strong>Eszközök összekapcsolása</strong>
            <p>Szinkronizáld a gyűjteményed más eszközökre, és férj hozzá bárhol, bármikor.</p>
          </div>
          <span className={styles.deviceArrow}>›</span>
        </div>
        <div className={styles.deviceButtons}>
          <button type="button" onClick={() => void copyKey()}>▤ &nbsp; Kulcs másolása</button>
          <button type="button" onClick={importKey}>⌗ &nbsp; Kulcs beillesztése</button>
        </div>
      </section>

      <footer className={styles.footer}>MOTA Import v0.6.1</footer>
    </main>
  );
}
