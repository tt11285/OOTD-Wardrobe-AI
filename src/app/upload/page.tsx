"use client";

import { useRef, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
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

    const autoCount = enriched.filter((r) => r.status === "auto_accepted").length;
    const reviewCount = enriched.filter((r) => r.status === "needs_review").length;
    const failedCount = enriched.filter((r) => r.status === "failed").length;
    const processedCount = data.imageProcessedCount ?? 0;

    setResults(enriched);
    setIsLoading(false);
    setPhase("done");
    setMessage(
      [
        autoCount ? `✅ ${autoCount} auto-added` : null,
        reviewCount ? `🔍 ${reviewCount} to confirm` : null,
        failedCount ? `❌ ${failedCount} failed` : null,
        processedCount ? `🪄 ${processedCount} cut out` : null,
      ]
        .filter(Boolean)
        .join("　") || "Recognition complete",
    );
  }

  async function saveReviewed(item: StoredClothingItem) {
    await authedFetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, userId, manuallyEdited: true }),
    });
    // Remove from results after save
    setResults((prev) => prev.filter((r) => r.item.id !== item.id));
  }

  const autoAccepted = results.filter((r) => r.status === "auto_accepted");
  const needsReview = results.filter((r) => r.status === "needs_review");
  const failed = results.filter((r) => r.status === "failed");

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

      {/* ── Review sections ─────────────────────────── */}
      {needsReview.length ? (
        <section className="review-section">
          <h2 className="section-title warning-title">🔍 Needs your confirmation ({needsReview.length})</h2>
          <div className="review-list">
            {needsReview.map((result) => (
              <ReviewCard key={result.item.id} result={result} onSave={saveReviewed} />
            ))}
          </div>
        </section>
      ) : null}

      {autoAccepted.length ? (
        <section className="review-section">
          <h2 className="section-title success-title">✅ Auto-added ({autoAccepted.length})</h2>
          <div className="review-list">
            {autoAccepted.map((result) => (
              <ReviewCard key={result.item.id} result={result} onSave={saveReviewed} />
            ))}
          </div>
        </section>
      ) : null}

      {failed.length ? (
        <section className="review-section">
          <h2 className="section-title failed-title">❌ Failed — retake suggested ({failed.length})</h2>
          <div className="review-list">
            {failed.map((result) => (
              <ReviewCard key={result.item.id} result={result} onSave={saveReviewed} />
            ))}
          </div>
        </section>
      ) : null}

      <BottomNav />
    </main>
  );
}

// ─── ReviewCard ──────────────────────────────────────────────────────────────
function ReviewCard({
  result,
  onSave,
}: {
  result: RecognitionResult;
  onSave: (item: StoredClothingItem) => void;
}) {
  const [item, setItem] = useState(result.item);
  const auto = result.status === "auto_accepted";
  const failed = result.status === "failed";

  return (
    <article className={`review-card ${failed ? "review-card--failed" : ""}`}>
      <div className="review-card-image">
        {item.imageUrl ? (
          <img alt={item.name} src={item.imageUrl} />
        ) : (
          <div className="review-card-no-image">No image</div>
        )}
      </div>
      <div className="review-fields">
        <span
          className={
            auto ? "status-badge success" : failed ? "status-badge failed-badge" : "status-badge warning"
          }
        >
          {auto ? "Auto-added" : failed ? "Failed" : "To confirm"}
        </span>
        {!failed && (
          <>
            <input
              aria-label="Name"
              value={item.name}
              onChange={(e) => setItem({ ...item, name: e.target.value })}
            />
            <select
              aria-label="Category"
              value={item.category}
              onChange={(e) => setItem({ ...item, category: e.target.value as ClothingCategory })}
            >
              {clothingCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel(cat)}
                </option>
              ))}
            </select>
            <input
              aria-label="Colors (comma separated)"
              value={item.colors.join(", ")}
              onChange={(e) => setItem({ ...item, colors: splitTags(e.target.value) })}
            />
            {!auto ? (
              <button className="primary-button" onClick={() => onSave(item)} type="button">
                Add to wardrobe
              </button>
            ) : null}
          </>
        )}
        {failed && (
          <p className="failed-hint">Too dark or too occluded — retake the photo and upload again.</p>
        )}
      </div>
    </article>
  );
}

// ─── String helpers ──────────────────────────────────────────────────────────
function splitTags(value: string): string[] {
  return value
    .split(/[、,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
