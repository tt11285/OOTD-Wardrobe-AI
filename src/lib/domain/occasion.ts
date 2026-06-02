export type OccasionHint = {
  label: string;
  formality: number;
  style: string;
  keywords: string[];
};

// `label` is the English UI text shown on chips and sent as the occasion.
// `keywords` keeps Chinese terms too, so the Chinese system prompt + formality
// mapping still resolves correctly whether the user picks a chip or types freely.
const quickHints: OccasionHint[] = [
  { label: "Commute", formality: 3, style: "urban commute", keywords: ["commute", "work", "office", "commuting"] },
  { label: "Date", formality: 3, style: "soft and refined", keywords: ["date", "dinner", "meetup"] },
  { label: "Interview", formality: 4, style: "sharp and credible", keywords: ["interview", "job", "offer"] },
  { label: "Casual", formality: 2, style: "relaxed and easy", keywords: ["casual", "weekend", "shopping"] },
  { label: "Meeting", formality: 4, style: "restrained and professional", keywords: ["meeting", "client", "presentation"] },
];

export const occasionTags = quickHints.map((hint) => hint.label);

export function occasionHint(input: string): OccasionHint {
  const normalized = input.trim().toLowerCase();
  const matched = quickHints.find((hint) =>
    [hint.label, ...hint.keywords].some((keyword) => normalized.includes(keyword.toLowerCase())),
  );

  return matched ?? { label: input.trim() || "everyday", formality: 3, style: "clean and polished", keywords: [] };
}
