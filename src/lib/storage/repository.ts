import type { ClothingCategory, ClothingItem } from "@/lib/domain/clothing";
import { createSupabaseServerClient } from "@/lib/storage/supabase";

export type StoredClothingItem = Required<
  Pick<
    ClothingItem,
    | "id"
    | "userId"
    | "imageUrl"
    | "category"
    | "name"
    | "brand"
    | "material"
    | "colors"
    | "styleTags"
    | "season"
    | "formality"
    | "confidence"
    | "manuallyEdited"
    | "createdAt"
    | "updatedAt"
  >
>;

export type RecognitionRecord = {
  id: string;
  userId: string;
  imageUrl: string;
  rawOutput: unknown;
  confidence: number;
  status: "auto_accepted" | "needs_review" | "failed";
  finalItemId: string | null;
  createdAt: string;
};

// A piece inside an outfit. Owned pieces map to a real wardrobe item (itemId +
// image); suggested pieces (aspirational looks) are described garments the user
// doesn't own yet.
export type OutfitPiece = {
  itemId: string | null;
  name: string;
  category: ClothingCategory;
  colors: string[];
  owned: boolean;
};

export type OutfitCandidate = {
  id: string;
  userId: string;
  occasion: string;
  selectedItems: string[];
  reason: string;
  style: string;
  colorLogic: string;
  userAction: "pending" | "accepted" | "rejected";
  rank: number;
  modelUsed: string;
  createdAt: string;
  // Transport/render-only (not persisted): "wardrobe" looks are fully wearable
  // from the user's closet; "aspirational" looks may include suggested pieces.
  kind?: "wardrobe" | "aspirational";
  pieces?: OutfitPiece[];
};

type ItemPatch = Partial<
  Pick<
    StoredClothingItem,
    "name" | "brand" | "material" | "category" | "colors" | "styleTags" | "season" | "formality" | "confidence" | "manuallyEdited"
  >
>;

export type ClothingItemRow = {
  id: string;
  user_id: string;
  image_url: string;
  category: ClothingCategory;
  name: string;
  brand: string | null;
  material: string | null;
  colors: string[];
  style_tags: string[];
  season: string[];
  formality: number;
  confidence: number;
  manually_edited: boolean;
  created_at: string;
  updated_at: string;
};

type RecognitionResultRow = {
  id: string;
  user_id: string;
  image_url: string;
  raw_output: unknown;
  confidence: number;
  status: RecognitionRecord["status"];
  final_item_id: string | null;
  created_at: string;
};

type OutfitCandidateRow = {
  id: string;
  user_id: string;
  occasion: string;
  selected_items: string[];
  reason: string;
  style: string;
  color_logic: string;
  user_action: OutfitCandidate["userAction"];
  rank: number;
  model_used: string;
  created_at: string;
};

const memory = {
  items: new Map<string, StoredClothingItem>(),
  recognitions: new Map<string, RecognitionRecord>(),
  outfits: new Map<string, OutfitCandidate>(),
  events: [] as Array<{ userId: string; eventName: string; metadata: unknown; createdAt: string }>,
};

function nowIso(): string {
  return new Date().toISOString();
}

function id(): string {
  return globalThis.crypto?.randomUUID?.() ?? crypto.randomUUID();
}

export function createDemoItem(input: {
  userId: string;
  name: string;
  category: ClothingCategory;
  imageUrl?: string;
  brand?: string;
  material?: string;
  colors?: string[];
  styleTags?: string[];
  season?: string[];
  formality?: number;
  confidence?: number;
}): StoredClothingItem {
  const timestamp = nowIso();

  return {
    id: id(),
    userId: input.userId,
    imageUrl: input.imageUrl ?? "",
    category: input.category,
    name: input.name,
    brand: input.brand ?? "",
    material: input.material ?? "",
    colors: input.colors ?? [],
    styleTags: input.styleTags ?? [],
    season: input.season ?? [],
    formality: input.formality ?? 3,
    confidence: input.confidence ?? 0.9,
    manuallyEdited: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function resetMemoryRepository(): void {
  memory.items.clear();
  memory.recognitions.clear();
  memory.outfits.clear();
  memory.events = [];
}

export const memoryRepository = {
  async listItems(userId: string): Promise<StoredClothingItem[]> {
    return [...memory.items.values()].filter((item) => item.userId === userId);
  },

  async saveItem(item: StoredClothingItem): Promise<StoredClothingItem> {
    memory.items.set(item.id, item);
    return item;
  },

  async updateItem(userId: string, itemId: string, patch: ItemPatch): Promise<StoredClothingItem | null> {
    const current = memory.items.get(itemId);

    if (!current || current.userId !== userId) {
      return null;
    }

    const updated: StoredClothingItem = {
      ...current,
      ...patch,
      updatedAt: nowIso(),
    };

    memory.items.set(itemId, updated);
    return updated;
  },

  async deleteItem(userId: string, itemId: string): Promise<boolean> {
    const current = memory.items.get(itemId);
    if (!current || current.userId !== userId) {
      return false;
    }
    memory.items.delete(itemId);
    return true;
  },

  async saveRecognition(record: RecognitionRecord): Promise<RecognitionRecord> {
    memory.recognitions.set(record.id, record);
    return record;
  },

  async listRecognitions(userId: string): Promise<RecognitionRecord[]> {
    return [...memory.recognitions.values()].filter((record) => record.userId === userId);
  },

  async saveOutfits(outfits: OutfitCandidate[]): Promise<OutfitCandidate[]> {
    outfits.forEach((outfit) => memory.outfits.set(outfit.id, outfit));
    return outfits;
  },

  async acceptOutfit(userId: string, outfitId: string): Promise<OutfitCandidate | null> {
    const current = memory.outfits.get(outfitId);

    if (!current || current.userId !== userId) {
      return null;
    }

    const updated: OutfitCandidate = { ...current, userAction: "accepted" };
    memory.outfits.set(outfitId, updated);
    return updated;
  },

  async trackEvent(userId: string, eventName: string, metadata: unknown = {}): Promise<void> {
    memory.events.push({ userId, eventName, metadata, createdAt: nowIso() });
  },
};

export function toClothingItemRow(item: StoredClothingItem): ClothingItemRow {
  return {
    id: item.id,
    user_id: item.userId,
    image_url: item.imageUrl,
    category: item.category,
    name: item.name,
    brand: item.brand || null,
    material: item.material || null,
    colors: item.colors,
    style_tags: item.styleTags,
    season: item.season,
    formality: item.formality,
    confidence: item.confidence,
    manually_edited: item.manuallyEdited,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function toStoredClothingItem(row: ClothingItemRow): StoredClothingItem {
  return {
    id: row.id,
    userId: row.user_id,
    imageUrl: row.image_url,
    category: row.category,
    name: row.name,
    brand: row.brand ?? "",
    material: row.material ?? "",
    colors: row.colors,
    styleTags: row.style_tags,
    season: row.season,
    formality: row.formality,
    confidence: row.confidence,
    manuallyEdited: row.manually_edited,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRecognitionResultRow(record: RecognitionRecord): RecognitionResultRow {
  return {
    id: record.id,
    user_id: record.userId,
    image_url: record.imageUrl,
    raw_output: record.rawOutput,
    confidence: record.confidence,
    status: record.status,
    final_item_id: record.finalItemId,
    created_at: record.createdAt,
  };
}

function toRecognitionRecord(row: RecognitionResultRow): RecognitionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    imageUrl: row.image_url,
    rawOutput: row.raw_output,
    confidence: row.confidence,
    status: row.status,
    finalItemId: row.final_item_id,
    createdAt: row.created_at,
  };
}

function toOutfitCandidateRow(outfit: OutfitCandidate): OutfitCandidateRow {
  return {
    id: outfit.id,
    user_id: outfit.userId,
    occasion: outfit.occasion,
    selected_items: outfit.selectedItems,
    reason: outfit.reason,
    style: outfit.style,
    color_logic: outfit.colorLogic,
    user_action: outfit.userAction,
    rank: outfit.rank,
    model_used: outfit.modelUsed,
    created_at: outfit.createdAt,
  };
}

function toOutfitCandidate(row: OutfitCandidateRow): OutfitCandidate {
  return {
    id: row.id,
    userId: row.user_id,
    occasion: row.occasion,
    selectedItems: row.selected_items,
    reason: row.reason,
    style: row.style,
    colorLogic: row.color_logic,
    userAction: row.user_action,
    rank: row.rank,
    modelUsed: row.model_used,
    createdAt: row.created_at,
  };
}

function supabaseError(message: string): Error {
  return new Error(`Supabase repository error: ${message}`);
}

// True when the error is about the optional brand/material columns not existing
// yet (so callers can retry without them). Lets the app work before the
// `alter table … add column brand/material` migration is run.
function isMissingNewColumn(message: string): boolean {
  return /(brand|material)/i.test(message) && /(does not exist|could not find|schema cache|column)/i.test(message);
}

export const supabaseRepository = {
  async listItems(userId: string): Promise<StoredClothingItem[]> {
    const client = createSupabaseServerClient();

    if (!client) {
      return memoryRepository.listItems(userId);
    }

    const { data, error } = await client
      .from("clothing_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw supabaseError(error.message);
    }

    return (data as ClothingItemRow[]).map(toStoredClothingItem);
  },

  async saveItem(item: StoredClothingItem): Promise<StoredClothingItem> {
    const client = createSupabaseServerClient();

    if (!client) {
      return memoryRepository.saveItem(item);
    }

    const row = toClothingItemRow(item);
    let { data, error } = await client.from("clothing_items").insert(row).select("*").single();

    // Graceful degradation: if the optional brand/material columns haven't been
    // added to the DB yet, retry the insert without them so the item still saves.
    if (error && isMissingNewColumn(error.message)) {
      const { brand: _b, material: _m, ...rest } = row;
      void _b;
      void _m;
      ({ data, error } = await client.from("clothing_items").insert(rest).select("*").single());
    }

    if (error) {
      throw supabaseError(error.message);
    }

    return toStoredClothingItem(data as ClothingItemRow);
  },

  async updateItem(userId: string, itemId: string, patch: ItemPatch): Promise<StoredClothingItem | null> {
    const client = createSupabaseServerClient();

    if (!client) {
      return memoryRepository.updateItem(userId, itemId, patch);
    }

    const rowPatch: Partial<ClothingItemRow> = {
      name: patch.name,
      brand: patch.brand,
      material: patch.material,
      category: patch.category,
      colors: patch.colors,
      style_tags: patch.styleTags,
      season: patch.season,
      formality: patch.formality,
      confidence: patch.confidence,
      manually_edited: patch.manuallyEdited,
      updated_at: nowIso(),
    };
    const cleanPatch = Object.fromEntries(Object.entries(rowPatch).filter(([, value]) => value !== undefined));
    const runUpdate = (patch: Record<string, unknown>) =>
      client.from("clothing_items").update(patch).eq("user_id", userId).eq("id", itemId).select("*").maybeSingle();

    let { data, error } = await runUpdate(cleanPatch);

    // Graceful degradation when brand/material columns aren't in the DB yet.
    if (error && isMissingNewColumn(error.message)) {
      const { brand: _b, material: _m, ...rest } = cleanPatch;
      void _b;
      void _m;
      ({ data, error } = await runUpdate(rest));
    }

    if (error) {
      throw supabaseError(error.message);
    }

    return data ? toStoredClothingItem(data as ClothingItemRow) : null;
  },

  async deleteItem(userId: string, itemId: string): Promise<boolean> {
    const client = createSupabaseServerClient();

    if (!client) {
      return memoryRepository.deleteItem(userId, itemId);
    }

    const { error } = await client.from("clothing_items").delete().eq("user_id", userId).eq("id", itemId);

    if (error) {
      throw supabaseError(error.message);
    }

    return true;
  },

  async saveRecognition(record: RecognitionRecord): Promise<RecognitionRecord> {
    const client = createSupabaseServerClient();

    if (!client) {
      return memoryRepository.saveRecognition(record);
    }

    const { data, error } = await client
      .from("recognition_results")
      .insert(toRecognitionResultRow(record))
      .select("*")
      .single();

    if (error) {
      throw supabaseError(error.message);
    }

    return toRecognitionRecord(data as RecognitionResultRow);
  },

  async listRecognitions(userId: string): Promise<RecognitionRecord[]> {
    const client = createSupabaseServerClient();

    if (!client) {
      return memoryRepository.listRecognitions(userId);
    }

    const { data, error } = await client.from("recognition_results").select("*").eq("user_id", userId);

    if (error) {
      throw supabaseError(error.message);
    }

    return (data as RecognitionResultRow[]).map(toRecognitionRecord);
  },

  async saveOutfits(outfits: OutfitCandidate[]): Promise<OutfitCandidate[]> {
    const client = createSupabaseServerClient();

    if (!client) {
      return memoryRepository.saveOutfits(outfits);
    }

    if (outfits.length === 0) {
      return [];
    }

    const { data, error } = await client.from("outfit_candidates").insert(outfits.map(toOutfitCandidateRow)).select("*");

    if (error) {
      throw supabaseError(error.message);
    }

    return (data as OutfitCandidateRow[]).map(toOutfitCandidate);
  },

  async acceptOutfit(userId: string, outfitId: string): Promise<OutfitCandidate | null> {
    const client = createSupabaseServerClient();

    if (!client) {
      return memoryRepository.acceptOutfit(userId, outfitId);
    }

    const { data, error } = await client
      .from("outfit_candidates")
      .update({ user_action: "accepted" })
      .eq("user_id", userId)
      .eq("id", outfitId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw supabaseError(error.message);
    }

    return data ? toOutfitCandidate(data as OutfitCandidateRow) : null;
  },

  async trackEvent(userId: string, eventName: string, metadata: unknown = {}): Promise<void> {
    const client = createSupabaseServerClient();

    if (!client) {
      await memoryRepository.trackEvent(userId, eventName, metadata);
      return;
    }

    const { error } = await client.from("usage_events").insert({
      id: id(),
      user_id: userId,
      event_name: eventName,
      metadata,
      created_at: nowIso(),
    });

    if (error) {
      throw supabaseError(error.message);
    }
  },
};

export const repository = supabaseRepository;

export { id as createId, nowIso };
