"use client";

import { useRef, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { TagInput } from "@/components/tag-input";
import { useAuth } from "@/lib/state/user";
import { authedFetch } from "@/lib/api/authed-fetch";
import type { StoredClothingItem } from "@/lib/storage/repository";
import { clothingCategories, type ClothingCategory } from "@/lib/domain/clothing";
import { categoryLabel } from "@/lib/domain/outfits";

type RecognitionResult = {
  status: "auto_accepted" | "needs_review" | "failed";
  item: StoredClothingItem;
  imageProcessed?: boolean;
};

// ─── Format detection (magic bytes) ──────────────────────────────────────────
// Reads the first 16 bytes of a file to detect the REAL format regardless of
// file extension or declared MIME type. This catches "photo.heic renamed to
// photo.png" which is common when airdropping iPhone photos.

type ImageFormat = "jpeg" | "png" | "webp" | "gif" | "heic" | "unknown";

async function detectRealFormat(file: File): Promise<ImageFormat> {
  const buf = await file.slice(0, 16).arrayBuffer();
  const b = new Uint8Array(buf);

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";

  // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50  ("RIFF....WEBP")
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "webp";

  // GIF: 47 49 46 38  ("GIF8")
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "gif";

  // HEIC/HEIF: bytes 4-7 = "ftyp" (66 74 79 70) + brand at 8-11
  // Common brands: heic, heix, hevc, hevx, heim, heis, mif1, msf1
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]).toLowerCase();
    const heicBrands = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"];
    if (heicBrands.includes(brand)) return "heic";
  }

  return "unknown";
}

// Claude vision supports: JPEG, PNG, GIF, WebP.
// Returns null if format is fine; returns a human-readable error string if not.
async function validateImageFormat(file: File): Promise<string | null> {
  const fmt = await detectRealFormat(file);
  if (fmt === "heic") {
    return `"${file.name}" is HEIC/HEIF (iPhone's default format).\nSwitch your camera to JPEG via Settings → Camera → Formats → Most Compatible, or in Photos: long-press → Share → Save as JPEG.`;
  }
  if (fmt === "unknown") {
    // Unknown magic bytes — might still be something Claude can't handle.
    // Check the declared type/extension as a secondary signal.
    const suspicious = /heic|heif|tiff?|bmp|ico|avif|jxl/i;
    if (suspicious.test(file.type) || suspicious.test(file.name)) {
      return `"${file.name}" is an unsupported format (${file.type || "unknown"}). Please upload a JPG, PNG or WebP image.`;
    }
  }
  return null; // format is OK
}

// ─── Image compression ───────────────────────────────────────────────────────
// Resize to max 1280 px on the longest side, encode as JPEG @ 85% quality.
const COMPRESS_MAX_PX = 1280;
const COMPRESS_QUALITY = 0.85;
const MIN_VALID_BASE64_CHARS = 500;

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { naturalWidth, naturalHeight } = img;

      // If the browser decoded this as ≤1×1, something went wrong
      // (renamed HEIC, unsupported codec, etc.). Reject clearly.
      if (!naturalWidth || !naturalHeight || naturalWidth <= 1 || naturalHeight <= 1) {
        reject(
          new Error(
            `"${file.name}" could not be decoded by the browser (size ≤1px). ` +
            "Make sure it's a JPG / PNG / WebP image — HEIC must be converted to JPEG first.",
          ),
        );
        return;
      }

      let w = naturalWidth;
      let h = naturalHeight;

      if (w > COMPRESS_MAX_PX || h > COMPRESS_MAX_PX) {
        if (w >= h) {
          h = Math.round((h * COMPRESS_MAX_PX) / w);
          w = COMPRESS_MAX_PX;
        } else {
          w = Math.round((w * COMPRESS_MAX_PX) / h);
          h = COMPRESS_MAX_PX;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error(`Could not create canvas (${file.name})`));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", COMPRESS_QUALITY);

      const base64Part = dataUrl.split(",")[1] ?? "";
      if (base64Part.length < MIN_VALID_BASE64_CHARS) {
        reject(
          new Error(
            `"${file.name}" produced too little image data after compression — the format may be broken. Re-export as a standard JPEG and try again.`,
          ),
        );
        return;
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          `"${file.name}" failed to load. Make sure it's a JPG / PNG / WebP image — ` +
          "for HEIC, first export it as JPEG via Photos → Share → Save as JPEG.",
        ),
      );
    };

    img.src = objectUrl;
  });
}

// ─── Upload page ─────────────────────────────────────────────────────────────
export default function UploadPage() {
  const { userId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // previews: compressed base64 URLs stored CLIENT-SIDE only.
  // We never rely on the server echoing them back.
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "compressing" | "recognizing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [confirmedCount, setConfirmedCount] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;

    const selected = [...files].slice(0, 10);

    // ── Pre-flight: check magic bytes for EACH file before compressing.
    //    This catches HEIC files renamed to .jpg/.png (common on iPhone).
    const formatErrors: string[] = [];
    for (const file of selected) {
      const err = await validateImageFormat(file);
      if (err) formatErrors.push(err);
    }
    if (formatErrors.length) {
      setPhase("error");
      setMessage("❌ Some images aren't supported:\n" + formatErrors.join("\n"));
      return;
    }

    setResults([]);
    setConfirmedCount(0);
    setIsLoading(true);
    setPhase("compressing");
    setMessage(`Compressing ${selected.length} image${selected.length > 1 ? "s" : ""}…`);

    let compressed: string[];
    try {
      compressed = await Promise.all(selected.map(compressImage));
    } catch (err) {
      setIsLoading(false);
      setPhase("error");
      setMessage(err instanceof Error ? `❌ ${err.message}` : "Image processing failed, please retry");
      return;
    }

    // Show previews immediately after compression
    setPreviews(compressed);
    setPhase("recognizing");
    setMessage("AI cutout + recognition, about 10–20s…");

    let data: {
      results?: RecognitionResult[];
      provider?: string;
      error?: string;
      imageProcessedCount?: number;
    };
    try {
      const response = await authedFetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, imageUrls: compressed }),
      });
      data = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        setPhase("error");
        setMessage(`Recognition failed: ${data.error ?? "check the model API config"}`);
        return;
      }
    } catch {
      setIsLoading(false);
      setPhase("error");
      setMessage("Network error — check your connection and retry");
      return;
    }

    // Prefer the server-returned URL — it's either:
    //   • a Supabase Storage CDN URL pointing to the EXTRACTED (background-
    //     removed) clothing image, or
    //   • a Storage URL for the original image (when extraction failed).
    // Only fall back to the local compressed preview if the server returned
    // something that isn't a real http URL (e.g. local dev without Supabase).
    const enriched: RecognitionResult[] = (data.results ?? []).map(
      (result: RecognitionResult, i: number) => {
        const serverUrl = result.item.imageUrl;
        const useServerUrl = typeof serverUrl === "string" && serverUrl.startsWith("http");
        return {
          ...result,
          item: {
            ...result.item,
            imageUrl: useServerUrl ? serverUrl : (compressed[i] ?? serverUrl),
          },
        };
      },
    );

    const processedCount = data.imageProcessedCount ?? 0;

    setResults(enriched);
    setIsLoading(false);
    setPhase("done");
    setMessage(
      `Recognized ${enriched.length} item${enriched.length > 1 ? "s" : ""}${processedCount ? ` · ${processedCount} cut out` : ""}. Review and confirm below.`,
    );
  }

  // Update one pending card's field as the user edits (parent holds the source
  // of truth so "Confirm all" picks up edits).
  function patchCard(id: string, patch: Partial<StoredClothingItem>) {
    setResults((prev) => prev.map((r) => (r.item.id === id ? { ...r, item: { ...r.item, ...patch } } : r)));
  }

  async function postItem(item: StoredClothingItem) {
    await authedFetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        userId,
        imageUrl: item.imageUrl,
        name: item.name,
        brand: item.brand,
        material: item.material,
        category: item.category,
        colors: item.colors,
        styleTags: item.styleTags,
        season: item.season,
        formality: item.formality,
        confidence: item.confidence,
        manuallyEdited: true,
      }),
    });
  }

  async function confirmCard(item: StoredClothingItem) {
    await postItem(item);
    setResults((prev) => prev.filter((r) => r.item.id !== item.id));
    setConfirmedCount((c) => c + 1);
  }

  function discardCard(id: string) {
    setResults((prev) => prev.filter((r) => r.item.id !== id));
  }

  async function confirmAll() {
    const items = results.map((r) => r.item);
    await Promise.all(items.map(postItem));
    setConfirmedCount((c) => c + items.length);
    setResults([]);
  }

  function handleCarouselScroll() {
    const el = carouselRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>(".confirm-card"));
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(cardCenter - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    setActiveIdx(best);
  }

  function scrollToCard(index: number) {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.querySelectorAll<HTMLElement>(".confirm-card")[index];
    if (card) el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2, behavior: "smooth" });
  }

  return (
    <main className="app-page mobile-shell">
      <header className="screen-header">
        <p className="eyebrow">ADD</p>
        <h1>Snap your clothes — let AI learn your wardrobe.</h1>
        <p>Up to 10 photos per batch, multiple pieces per photo. Aim to add 30–100 items in your first 10 minutes.</p>
      </header>

      {/* ── Upload zone ─────────────────────────────── */}
      <section className="upload-zone">
        <input
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          id="wardrobe-files"
          multiple
          ref={fileInputRef}
          onChange={(e) => onFiles(e.target.files)}
          type="file"
        />
        <label htmlFor="wardrobe-files" className={isLoading ? "upload-label uploading" : "upload-label"}>
          {isLoading ? (
            <>
              <span className="upload-spinner" aria-hidden="true" />
              {phase === "compressing" ? "Processing…" : "AI scanning…"}
            </>
          ) : previews.length ? (
            "Add more clothes"
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Select 1–10 clothing photos
            </>
          )}
        </label>

        {/* Format hint */}
        <div className="format-hint-row">
          <span className="format-badge">✓ JPG</span>
          <span className="format-badge">✓ PNG</span>
          <span className="format-badge">✓ WebP</span>
          <span className="format-badge format-badge--no">✗ HEIC</span>
          <span className="format-hint-note">iPhone: switch to JPEG first — Settings → Camera → Formats → Most Compatible</span>
        </div>
      </section>

      {/* ── Status message ──────────────────────────── */}
      {message ? (
        <div className={`status-text status-${phase}`} role="status" style={{ whiteSpace: "pre-line" }}>
          {message}
        </div>
      ) : null}

      {/* ── Preview grid ────────────────────────────── */}
      {previews.length ? (
        <section className="preview-grid" aria-label="Upload previews">
          {previews.map((src, i) => (
            <img alt={`Clothing photo ${i + 1}`} key={i} src={src} />
          ))}
        </section>
      ) : null}

      {/* ── Review & confirm (swipe horizontally) ───── */}
      {results.length ? (
        <section className="review-section">
          <div className="confirm-head">
            <h2 className="section-title">
              Review &amp; confirm <span className="confirm-count">{activeIdx + 1} / {results.length}</span>
            </h2>
            <button className="secondary-button confirm-all" type="button" onClick={confirmAll}>
              Confirm all
            </button>
          </div>
          <div className="confirm-carousel" ref={carouselRef} onScroll={handleCarouselScroll}>
            {results.map((result) => (
              <ConfirmCard
                key={result.item.id}
                result={result}
                onPatch={patchCard}
                onConfirm={confirmCard}
                onDiscard={discardCard}
              />
            ))}
          </div>
          {results.length > 1 ? (
            <div className="outfit-dots">
              {results.map((result, index) => (
                <button
                  key={result.item.id}
                  className={index === activeIdx ? "dot active" : "dot"}
                  type="button"
                  onClick={() => scrollToCard(index)}
                  aria-label={`Go to item ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {confirmedCount ? (
        <p className="status-text status-done" role="status">
          ✅ {confirmedCount} added to your wardrobe.
        </p>
      ) : null}

      <BottomNav />
    </main>
  );
}

// ─── ConfirmCard ─────────────────────────────────────────────────────────────
function ConfirmCard({
  result,
  onPatch,
  onConfirm,
  onDiscard,
}: {
  result: RecognitionResult;
  onPatch: (id: string, patch: Partial<StoredClothingItem>) => void;
  onConfirm: (item: StoredClothingItem) => void;
  onDiscard: (id: string) => void;
}) {
  const { item, status } = result;
  const hint =
    status === "auto_accepted"
      ? { cls: "success", label: "High confidence" }
      : status === "failed"
        ? { cls: "failed-badge", label: "Low — check carefully" }
        : { cls: "warning", label: "Please verify" };

  return (
    <article className="confirm-card">
      <div className="review-card-image">
        {item.imageUrl ? <img alt={item.name} src={item.imageUrl} /> : <div className="review-card-no-image">No image</div>}
      </div>
      <div className="review-fields">
        <span className={`status-badge ${hint.cls}`}>{hint.label}</span>

        <label className="modal-field">
          <span>Name</span>
          <input value={item.name} onChange={(e) => onPatch(item.id, { name: e.target.value })} />
        </label>

        <label className="modal-field">
          <span>Category</span>
          <select value={item.category} onChange={(e) => onPatch(item.id, { category: e.target.value as ClothingCategory })}>
            {clothingCategories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabel(cat)}
              </option>
            ))}
          </select>
        </label>

        <label className="modal-field">
          <span>Brand</span>
          <input value={item.brand} placeholder="optional" onChange={(e) => onPatch(item.id, { brand: e.target.value })} />
        </label>

        <label className="modal-field">
          <span>Material</span>
          <input value={item.material} placeholder="e.g. cotton" onChange={(e) => onPatch(item.id, { material: e.target.value })} />
        </label>

        <TagInput label="Colors" tags={item.colors} onChange={(t) => onPatch(item.id, { colors: t })} placeholder="add color" />
        <TagInput label="Style" tags={item.styleTags} onChange={(t) => onPatch(item.id, { styleTags: t })} placeholder="add tag" />
        <TagInput label="Season" tags={item.season} onChange={(t) => onPatch(item.id, { season: t })} placeholder="add season" />

        <label className="modal-field">
          <span>Formality · {item.formality}</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={item.formality}
            onChange={(e) => onPatch(item.id, { formality: Number(e.target.value) })}
          />
        </label>

        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={() => onDiscard(item.id)}>
            Discard
          </button>
          <button className="primary-button" type="button" onClick={() => onConfirm(item)}>
            Confirm
          </button>
        </div>
      </div>
    </article>
  );
}
