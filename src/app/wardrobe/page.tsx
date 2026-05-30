"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { ItemCard } from "@/components/item-card";
import { TagInput } from "@/components/tag-input";
import { clothingCategories, type ClothingCategory } from "@/lib/domain/clothing";
import { categoryLabel } from "@/lib/domain/outfits";
import { useAuth } from "@/lib/state/user";
import { authedFetch } from "@/lib/api/authed-fetch";
import type { StoredClothingItem } from "@/lib/storage/repository";

export default function WardrobePage() {
  const { userId } = useAuth();
  const [items, setItems] = useState<StoredClothingItem[]>([]);
  const [filter, setFilter] = useState<ClothingCategory | "all">("all");
  const [editing, setEditing] = useState<StoredClothingItem | null>(null);

  useEffect(() => {
    authedFetch(`/api/items?userId=${encodeURIComponent(userId)}`)
      .then((response) => response.json())
      .then((data) => setItems(data.items ?? []));
  }, [userId]);

  const visible = filter === "all" ? items : items.filter((item) => item.category === filter);

  function handleSaved(updated: StoredClothingItem) {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setEditing(null);
  }

  function handleDeleted(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    setEditing(null);
  }

  return (
    <main className="app-page mobile-shell">
      <header className="screen-header">
        <p className="eyebrow">WARDROBE</p>
        <h1>Your digital wardrobe</h1>
        <p>{items.length ? `${items.length} item${items.length > 1 ? "s" : ""} in your wardrobe` : "Snap a few clothes to get started."}</p>
      </header>

      {items.length ? (
        <>
          <div className="filter-row">
            <button className={filter === "all" ? "chip active" : "chip"} onClick={() => setFilter("all")} type="button">
              All
            </button>
            {clothingCategories.map((category) => (
              <button
                className={filter === category ? "chip active" : "chip"}
                key={category}
                onClick={() => setFilter(category)}
                type="button"
              >
                {categoryLabel(category)}
              </button>
            ))}
          </div>
          <section className="item-grid">
            {visible.map((item) => (
              <ItemCard item={item} key={item.id} onEdit={setEditing} />
            ))}
          </section>
        </>
      ) : (
        <EmptyState title="Your wardrobe is empty" copy="Upload a few real clothing photos so AI can style from your wardrobe." />
      )}

      {editing ? (
        <EditItemModal item={editing} onClose={() => setEditing(null)} onSaved={handleSaved} onDeleted={handleDeleted} />
      ) : null}

      <BottomNav />
    </main>
  );
}

// ─── Edit modal ──────────────────────────────────────────────────────────────
function EditItemModal({
  item,
  onClose,
  onSaved,
  onDeleted,
}: {
  item: StoredClothingItem;
  onClose: () => void;
  onSaved: (item: StoredClothingItem) => void;
  onDeleted: (itemId: string) => void;
}) {
  const [name, setName] = useState(item.name);
  const [brand, setBrand] = useState(item.brand);
  const [material, setMaterial] = useState(item.material);
  const [category, setCategory] = useState<ClothingCategory>(item.category);
  const [colors, setColors] = useState<string[]>(item.colors);
  const [styleTags, setStyleTags] = useState<string[]>(item.styleTags);
  const [season, setSeason] = useState<string[]>(item.season);
  const [formality, setFormality] = useState(item.formality);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const response = await authedFetch("/api/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: item.userId, itemId: item.id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setDeleting(false);
        setError(data.error ?? "Delete failed");
        return;
      }
      onDeleted(item.id);
    } catch {
      setDeleting(false);
      setError("Network error, please retry");
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await authedFetch("/api/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: item.userId,
          itemId: item.id,
          name,
          brand,
          material,
          category,
          colors,
          styleTags,
          season,
          formality,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSaving(false);
        setError(data.error ?? "Save failed");
        return;
      }
      onSaved(data.item);
    } catch {
      setSaving(false);
      setError("Network error, please retry");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit item">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h2>Edit item</h2>

        <label className="modal-field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="modal-field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as ClothingCategory)}>
            {clothingCategories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabel(cat)}
              </option>
            ))}
          </select>
        </label>

        <label className="modal-field">
          <span>Brand</span>
          <input value={brand} placeholder="optional" onChange={(e) => setBrand(e.target.value)} />
        </label>

        <label className="modal-field">
          <span>Material</span>
          <input value={material} placeholder="e.g. cotton" onChange={(e) => setMaterial(e.target.value)} />
        </label>

        <TagInput label="Colors" tags={colors} onChange={setColors} placeholder="add color" />
        <TagInput label="Style" tags={styleTags} onChange={setStyleTags} placeholder="add tag" />
        <TagInput label="Season" tags={season} onChange={setSeason} placeholder="add season" />

        <label className="modal-field">
          <span>Formality · {formality}</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={formality}
            onChange={(e) => setFormality(Number(e.target.value))}
          />
        </label>

        {error ? <p className="status-text status-error">{error}</p> : null}

        <div className="modal-actions">
          <button
            className={`danger-button${confirmDelete ? " is-confirming" : ""}`}
            type="button"
            onClick={remove}
            disabled={deleting}
            onBlur={() => setConfirmDelete(false)}
          >
            {deleting ? "Deleting…" : confirmDelete ? "Confirm delete?" : "Delete"}
          </button>
          <button className="primary-button" type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
