export type Ingredient = {
  name: string;
  amount?: string;
  note?: string;
};

export type MotaResult = {
  title: string;
  source_url: string;
  platform: string;
  uploader?: string;
  source_page_name?: string;
  source_page_url?: string;
  thumbnail_url?: string;
  recipe_group?: string;
  ingredient_tags?: string[];
  content_tags?: string[];
  language_detected?: string;
  hungarian_summary?: string;
  original_transcript?: string;
  hungarian_translation?: string;
  ingredients?: Ingredient[];
  method_steps?: string[];
  techniques?: string[];
  plating?: string[];
  equipment?: string[];
  chef_tips?: string[];
  competition_ideas?: string[];
  tags?: string[];
};

export type LibraryStatus = "saved" | "to_try" | "tested";

export type LibraryItem = {
  id: string;
  library_key_hash: string;
  source_url: string;
  title: string;
  platform: string;
  uploader: string;
  source_page_name: string;
  source_page_url: string;
  thumbnail_url: string;
  recipe_group: string;
  ingredient_tags: string[];
  content_tags: string[];
  language_detected: string;
  hungarian_summary: string;
  original_transcript: string;
  hungarian_translation: string;
  ingredients: Ingredient[];
  method_steps: string[];
  techniques: string[];
  plating: string[];
  equipment: string[];
  chef_tips: string[];
  competition_ideas: string[];
  tags: string[];
  favorite: boolean;
  for_competition: boolean;
  status: LibraryStatus;
  note: string;
  video_path: string;
  raw_result: MotaResult;
  created_at: string;
  updated_at: string;
};

const SUPABASE_URL = "https://syzpkrypgcwiyzzzlzzi.supabase.co";
const SUPABASE_KEY = "sb_publishable_NJNWYOypGVQ5dNbdi6ZVcw_mqO0oixb";
const STORAGE_KEY = "mota-import-library-key-v1";
const VIDEO_BUCKET = "mota-import-videos";
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function getLibraryKey(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing && existing.length >= 20) return existing;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const created = bytesToBase64Url(bytes);
  localStorage.setItem(STORAGE_KEY, created);
  return created;
}

export function setLibraryKey(value: string) {
  const key = value.trim();
  if (key.length < 20) throw new Error("A gyűjteménykulcs túl rövid.");
  localStorage.setItem(STORAGE_KEY, key);
}

export async function hashLibraryKey(key = getLibraryKey()) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function headers(key: string, extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    "x-mota-library-key": key,
    ...extra,
  };
}

async function api(path: string, init: RequestInit = {}) {
  const key = getLibraryKey();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...headers(key),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Gyűjtemény hiba (HTTP ${response.status})`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function uploadLibraryVideo(itemId: string, blob: Blob): Promise<string> {
  if (blob.size > MAX_VIDEO_BYTES) {
    throw new Error("A videó 50 MB-nál nagyobb, ezért a Gyűjteménybe csak az elemzés kerül elmentésre.");
  }

  const key = getLibraryKey();
  const keyHash = await hashLibraryKey(key);
  const ext = blob.type === "video/quicktime" ? "mov" : blob.type === "video/webm" ? "webm" : "mp4";
  const path = `${keyHash}/${itemId}.${ext}`;

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${VIDEO_BUCKET}/${encodeStoragePath(path)}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "x-mota-library-key": key,
        "Content-Type": blob.type || "video/mp4",
        "x-upsert": "true",
      },
      body: blob,
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Videótárhely hiba (HTTP ${response.status})`);
  }

  const rows = await api(`mota_import_items?id=eq.${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ video_path: path, updated_at: new Date().toISOString() }),
  }) as LibraryItem[];

  if (!rows?.[0]) throw new Error("A videó feltöltődött, de nem sikerült a gyűjteményhez kapcsolni.");
  return path;
}

export async function createLibraryVideoUrl(path: string, expiresIn = 3600): Promise<string> {
  if (!path) return "";
  const key = getLibraryKey();
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${VIDEO_BUCKET}/${encodeStoragePath(path)}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        "x-mota-library-key": key,
      },
      body: JSON.stringify({ expiresIn }),
    }
  );

  if (!response.ok) return "";
  const data = await response.json();
  const signed = data?.signedURL || data?.signedUrl || "";
  if (!signed) return "";
  return signed.startsWith("http") ? signed : `${SUPABASE_URL}/storage/v1${signed}`;
}

export async function deleteLibraryVideo(path: string) {
  if (!path) return;
  const key = getLibraryKey();
  await fetch(
    `${SUPABASE_URL}/storage/v1/object/${VIDEO_BUCKET}/${encodeStoragePath(path)}`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_KEY,
        "x-mota-library-key": key,
      },
    }
  ).catch(() => undefined);
}

export async function saveLibraryResult(result: MotaResult): Promise<LibraryItem> {
  const key = getLibraryKey();
  const keyHash = await hashLibraryKey(key);

  const sharedBody = {
    source_url: result.source_url,
    title: result.title || "Névtelen videó",
    platform: result.platform || "",
    uploader: result.uploader || "",
    source_page_name: result.source_page_name || result.uploader || "",
    source_page_url: result.source_page_url || "",
    thumbnail_url: result.thumbnail_url || "",
    recipe_group: result.recipe_group || "Egyéb",
    ingredient_tags: result.ingredient_tags || [],
    content_tags: result.content_tags || [],
    language_detected: result.language_detected || "",
    hungarian_summary: result.hungarian_summary || "",
    original_transcript: result.original_transcript || "",
    hungarian_translation: result.hungarian_translation || "",
    ingredients: result.ingredients || [],
    method_steps: result.method_steps || [],
    techniques: result.techniques || [],
    plating: result.plating || [],
    equipment: result.equipment || [],
    chef_tips: result.chef_tips || [],
    competition_ideas: result.competition_ideas || [],
    tags: result.tags || [],
    raw_result: result,
    updated_at: new Date().toISOString(),
  };

  const existing = await api(
    `mota_import_items?source_url=eq.${encodeURIComponent(result.source_url)}&select=*&order=created_at.desc&limit=1`
  ) as LibraryItem[];

  if (existing?.[0]) {
    const rows = await api(`mota_import_items?id=eq.${encodeURIComponent(existing[0].id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(sharedBody),
    }) as LibraryItem[];

    if (!rows?.[0]) throw new Error("A meglévő gyűjteményelem frissítése nem sikerült.");
    return rows[0];
  }

  const rows = await api("mota_import_items?on_conflict=library_key_hash,source_url", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      library_key_hash: keyHash,
      ...sharedBody,
    }),
  }) as LibraryItem[];

  if (!rows?.[0]) throw new Error("A mentés nem adott vissza rekordot.");
  return rows[0];
}

export async function listLibraryItems(): Promise<LibraryItem[]> {
  return await api("mota_import_items?select=*&order=created_at.desc&limit=500") as LibraryItem[];
}

export async function updateLibraryItem(id: string, patch: Partial<Pick<LibraryItem,
  "favorite" | "for_competition" | "status" | "note" | "thumbnail_url" | "tags"
>>): Promise<LibraryItem> {
  const rows = await api(`mota_import_items?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  }) as LibraryItem[];

  if (!rows?.[0]) throw new Error("A módosítás nem sikerült.");
  return rows[0];
}

export async function deleteLibraryItem(id: string, videoPath = "") {
  if (videoPath) await deleteLibraryVideo(videoPath);
  await api(`mota_import_items?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
