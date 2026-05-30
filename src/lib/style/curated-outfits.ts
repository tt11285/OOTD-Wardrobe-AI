// Hand-curated, demo-grade outfits per occasion. For the 5 preset occasions,
// these guarantee 3 polished, fashionable looks (resolved against the seeded
// wardrobe by item name). If the wardrobe doesn't contain the named pieces
// (e.g. a real user), this returns [] and the caller falls back to the AI.

import { occasionHint } from "@/lib/domain/occasion";
import {
  createId,
  nowIso,
  type OutfitCandidate,
  type OutfitPiece,
  type StoredClothingItem,
} from "@/lib/storage/repository";

type CuratedLook = {
  style: string;
  reason: string;
  colorLogic: string;
  pieces: string[]; // item names, must exist in the wardrobe
};

const CURATED: Record<string, CuratedLook[]> = {
  Commute: [
    {
      style: "French Minimal",
      reason:
        "The off-duty editor's commute: a crisp white shirt and black tailored trousers, softened by a camel trench. Loafers keep it sharp but walkable.",
      colorLogic: "White, black and camel — a clean three-color base that always reads expensive.",
      pieces: ["White cotton shirt", "Black tailored trousers", "Brown loafers", "Camel trench coat"],
    },
    {
      style: "Soft Tailoring",
      reason:
        "Tonal and relaxed without losing polish — a cream knit over flowing off-white trousers, grounded by clean white sneakers.",
      colorLogic: "Head-to-toe creams and camels create an elongating, monochrome wash.",
      pieces: ["Cream knit cardigan", "Off-white wide-leg pants", "White sneakers", "Camel silk scarf"],
    },
    {
      style: "Sharp Stripe",
      reason:
        "A structured navy blazer over a fresh blue stripe — professional with personality, finished with sleek ankle boots.",
      colorLogic: "Navy, black and pale blue stay in one cool family for a put-together look.",
      pieces: ["Light blue striped shirt", "Black tailored trousers", "Navy blazer", "Black ankle boots"],
    },
  ],
  Date: [
    {
      style: "Evening Soft",
      reason:
        "Quietly romantic: fluid ivory silk tucked into a camel A-line skirt, lifted by heels and a flash of gold.",
      colorLogic: "Ivory and camel feel warm and soft; gold adds the smallest glint of occasion.",
      pieces: ["Ivory silk blouse", "Camel A-line skirt", "Black heeled pumps", "Gold hoop earrings"],
    },
    {
      style: "Effortless Cool",
      reason:
        "The French-girl date look — slim black knit, dark denim and a camel trench thrown over. Easy, confident, never overdone.",
      colorLogic: "Black and navy with a camel topcoat: low-key, high-impact.",
      pieces: ["Black turtleneck", "Navy straight jeans", "Black ankle boots", "Camel trench coat"],
    },
    {
      style: "Tonal Elegance",
      reason:
        "Soft tailoring for dinner: a cream knit and wide-leg trousers elevated by sleek black heels and a structured tote.",
      colorLogic: "Creamy neutrals with black accents — gentle but grown-up.",
      pieces: ["Cream knit cardigan", "Off-white wide-leg pants", "Black heeled pumps", "Black leather tote"],
    },
  ],
  Interview: [
    {
      style: "Power Minimal",
      reason:
        "Your most credible self: a navy blazer over a crisp white shirt and tailored trousers projects competence without stiffness.",
      colorLogic: "Navy, white and black — the most trusted, fuss-free palette in the room.",
      pieces: ["White cotton shirt", "Black tailored trousers", "Navy blazer", "Black ankle boots"],
    },
    {
      style: "Approachable Pro",
      reason:
        "Competent and personable — a soft blue stripe warms up sharp trousers, while loafers and a matching belt feel considered.",
      colorLogic: "Blue and black kept calm; brown leather ties shoes and belt together.",
      pieces: ["Light blue striped shirt", "Black tailored trousers", "Brown loafers", "Brown leather belt"],
    },
    {
      style: "Refined Neutral",
      reason:
        "Modern and polished: silk and wide-leg tailoring under a clean black coat reads senior, not corporate-cliché.",
      colorLogic: "Ivory and off-white softened, anchored by decisive black.",
      pieces: ["Ivory silk blouse", "Off-white wide-leg pants", "Black wool coat", "Black heeled pumps"],
    },
  ],
  Casual: [
    {
      style: "Weekend Clean",
      reason:
        "The fail-safe weekend: a crisp shirt with dark denim and white sneakers — simple, fresh, never trying too hard.",
      colorLogic: "White, navy and a touch of brown — classic and clean.",
      pieces: ["White cotton shirt", "Navy straight jeans", "White sneakers", "Brown leather belt"],
    },
    {
      style: "Cozy Layers",
      reason:
        "Soft and easy for a slow day — a cozy cream knit over denim, with a silk scarf as the polished anchor.",
      colorLogic: "Warm cream and camel against navy keep it gentle and considered.",
      pieces: ["Cream knit cardigan", "Navy straight jeans", "White sneakers", "Camel silk scarf"],
    },
    {
      style: "Off-duty French",
      reason:
        "Minimal and cool: a black knit with flowing off-white trousers and sneakers — relaxed but distinctly styled.",
      colorLogic: "Black and off-white — the simplest, sharpest contrast there is.",
      pieces: ["Black turtleneck", "Off-white wide-leg pants", "White sneakers", "Black leather tote"],
    },
  ],
  Meeting: [
    {
      style: "Boardroom Sharp",
      reason:
        "Command the room: a navy blazer, white shirt and tailored trousers, finished with sleek heels. Authoritative and clean.",
      colorLogic: "Navy, white and black — pure, focused, no distractions.",
      pieces: ["White cotton shirt", "Black tailored trousers", "Navy blazer", "Black heeled pumps"],
    },
    {
      style: "Quiet Authority",
      reason:
        "All-black, all business: a monochrome column under a long wool coat reads decisive and modern.",
      colorLogic: "Tonal black with texture shifts — minimal, powerful, intentional.",
      pieces: ["Black turtleneck", "Black tailored trousers", "Black wool coat", "Black ankle boots"],
    },
    {
      style: "Modern Executive",
      reason:
        "Refined and current: silk and a camel skirt structured by a navy blazer — professional with warmth.",
      colorLogic: "Ivory, camel and navy — polished neutrals with a softer edge.",
      pieces: ["Ivory silk blouse", "Camel A-line skirt", "Navy blazer", "Brown loafers"],
    },
  ],
};

// Resolve curated looks for an occasion against the wardrobe (by item name).
// Returns only looks whose every piece exists; [] when nothing matches.
export function getCuratedOutfits(occasion: string, items: StoredClothingItem[]): OutfitCandidate[] {
  const normalized = occasion.trim().toLowerCase();
  const key =
    Object.keys(CURATED).find((k) => k.toLowerCase() === normalized) ?? occasionHint(occasion).label;
  const looks = CURATED[key];
  if (!looks) return [];

  const byName = new Map(items.map((it) => [it.name.toLowerCase(), it]));
  const timestamp = nowIso();
  const outfits: OutfitCandidate[] = [];

  looks.forEach((look, index) => {
    const resolved = look.pieces
      .map((name) => byName.get(name.toLowerCase()))
      .filter((it): it is StoredClothingItem => Boolean(it));

    // Only surface a look if every named piece is actually in the wardrobe.
    if (resolved.length < look.pieces.length) return;

    const pieces: OutfitPiece[] = resolved.map((it) => ({
      itemId: it.id,
      name: it.name,
      category: it.category,
      colors: it.colors,
      owned: true,
    }));

    outfits.push({
      id: createId(),
      userId: items[0]?.userId ?? "demo",
      occasion,
      kind: "wardrobe",
      pieces,
      selectedItems: resolved.map((it) => it.id),
      reason: look.reason,
      style: look.style,
      colorLogic: look.colorLogic,
      userAction: "pending",
      rank: index + 1,
      modelUsed: "curated",
      createdAt: timestamp,
    });
  });

  return outfits;
}
