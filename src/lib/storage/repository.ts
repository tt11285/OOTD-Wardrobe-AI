import type { ClothingCategory, ClothingItem } from "@/lib/domain/clothing";

export type StoredClothingItem = Required<
  Pick<
    ClothingItem,
    | "id"
    | "userId"
    | "imageUrl"
    | "category"
    | "name"
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
};

type ItemPatch = Partial<
  Pick<
    StoredClothingItem,
    "name" | "category" | "colors" | "styleTags" | "season" | "formality" | "confidence" | "manuallyEdited"
  >
>;

const memory = {
  items: new Map<string, StoredClothingItem>(),
  recognitions: new Map<string, RecognitionRecord>(),
  outfits: new Map<string, OutfitCandidate>(),
  events: [] as Array<{ userId: string; eventName: string; metadata: unknown; createdAt: string }>,
};

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

export function createDemoItem(input: {
  userId: string;
  name: string;
  category: ClothingCategory;
  imageUrl?: string;
  colors?: string[];
  styleTags?: string[];
  season?: string[];
  formality?: number;
  confidence?: number;
}): StoredClothingItem {
  const timestamp = nowIso();

  return {
    id: id("item"),
    userId: input.userId,
    imageUrl: input.imageUrl ?? "",
    category: input.category,
    name: input.name,
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

export const repository = memoryRepository;

export { id as createId, nowIso };
