import type { OccasionHint } from "@/lib/domain/occasion";

export const stylePrinciples = [
  "Keep the main colors to three or fewer — prioritize a clean look with room to breathe.",
  "For formal settings, favor crisp pieces: shirts, blazers, straight trousers, loafers.",
  "Casual looks can dial down formality but should keep one polished anchor — leather shoes, a belt, or a structured jacket.",
  "Loose-on-top with fitted-bottom (or the reverse) makes proportions read clearly.",
  "For interviews and important meetings, avoid bold prints and lean on low-saturation neutrals.",
];

export function stylePromptContext(hint: OccasionHint): string {
  return [
    `Occasion style: ${hint.style}`,
    `Target formality: ${hint.formality}`,
    "Styling principles:",
    ...stylePrinciples.map((rule, index) => `${index + 1}. ${rule}`),
  ].join("\n");
}
