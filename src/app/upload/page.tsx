"use client";

import { useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { getAnonymousUserId } from "@/lib/state/user";
import type { StoredClothingItem } from "@/lib/storage/repository";
import { clothingCategories, type ClothingCategory } from "@/lib/domain/clothing";
import { categoryLabel } from "@/lib/domain/outfits";

type RecognitionResult = {
  status: "auto_accepted" | "needs_review" | "failed";
  item: StoredClothingItem;
};

export default function UploadPage() {
  const userId = useMemo(() => getAnonymousUserId(), []);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const selected = [...files].slice(0, 10);
    const urls = await Promise.all(selected.map(readFileAsDataUrl));
    setPreviews(urls);
    setIsLoading(true);
    setMessage("正在认识你的衣服...");

    const response = await fetch("/api/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, imageUrls: urls }),
    });
    const data = await response.json();

    if (!response.ok) {
      setResults([]);
      setIsLoading(false);
      setMessage(`识别失败：${data.error ?? "请检查模型 API 配置"}`);
      return;
    }

    setResults(data.results ?? []);
    setIsLoading(false);
    setMessage(`已识别 ${data.results?.length ?? 0} 件衣物 · ${data.provider ?? "demo"}`);
  }

  async function saveReviewed(item: StoredClothingItem) {
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, userId, manuallyEdited: true }),
    });
    setMessage("已加入衣橱");
  }

  return (
    <main className="app-page mobile-shell">
      <header className="screen-header">
        <p className="eyebrow">建库</p>
        <h1>拍几张衣服，先让 AI 认识你的衣橱。</h1>
      </header>

      <section className="upload-zone">
        <input accept="image/*" id="wardrobe-files" multiple onChange={(event) => onFiles(event.target.files)} type="file" />
        <label htmlFor="wardrobe-files">选择 1-10 张衣物照片</label>
        <p>支持单件、多件悬挂或平铺。当前 demo 会在无 API key 时使用稳定 fallback。</p>
      </section>

      {isLoading ? <p className="status-text">正在调用审美雷达...</p> : null}
      {message ? <p className="status-text">{message}</p> : null}

      {previews.length ? (
        <section className="preview-grid" aria-label="上传预览">
          {previews.map((src) => (
            <img alt="上传的衣物" key={src} src={src} />
          ))}
        </section>
      ) : null}

      {results.length ? (
        <section className="review-list">
          {results.map((result) => (
            <ReviewCard key={result.item.id} result={result} onSave={saveReviewed} />
          ))}
        </section>
      ) : null}

      <BottomNav />
    </main>
  );
}

function ReviewCard({
  result,
  onSave,
}: {
  result: RecognitionResult;
  onSave: (item: StoredClothingItem) => void;
}) {
  const [item, setItem] = useState(result.item);
  const auto = result.status === "auto_accepted";

  return (
    <article className="review-card">
      <img alt={item.name} src={item.imageUrl} />
      <div className="review-fields">
        <span className={auto ? "status-badge success" : "status-badge warning"}>{auto ? "已自动入库" : "待你确认"}</span>
        <input value={item.name} onChange={(event) => setItem({ ...item, name: event.target.value })} />
        <select
          value={item.category}
          onChange={(event) => setItem({ ...item, category: event.target.value as ClothingCategory })}
        >
          {clothingCategories.map((category) => (
            <option key={category} value={category}>
              {categoryLabel(category)}
            </option>
          ))}
        </select>
        <input
          value={item.colors.join("、")}
          onChange={(event) => setItem({ ...item, colors: splitTags(event.target.value) })}
        />
        {!auto ? (
          <button className="primary-button" onClick={() => onSave(item)} type="button">
            确认入库
          </button>
        ) : null}
      </div>
    </article>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function splitTags(value: string): string[] {
  return value
    .split(/[、,，]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
