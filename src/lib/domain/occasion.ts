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
  { label: "Commute", formality: 3, style: "urban commute", keywords: ["commute", "work", "office", "上班", "办公室", "通勤"] },
  { label: "Date", formality: 3, style: "soft and refined", keywords: ["date", "dinner", "约会", "见面", "晚餐"] },
  { label: "Interview", formality: 4, style: "sharp and credible", keywords: ["interview", "job", "offer", "面试", "求职"] },
  { label: "Casual", formality: 2, style: "relaxed and easy", keywords: ["casual", "weekend", "休闲", "周末", "逛街"] },
  { label: "Meeting", formality: 4, style: "restrained and professional", keywords: ["meeting", "client", "会议", "客户", "汇报"] },
];

export const occasionTags = quickHints.map((hint) => hint.label);

export function occasionHint(input: string): OccasionHint {
  const normalized = input.trim().toLowerCase();
  const matched = quickHints.find((hint) =>
    [hint.label, ...hint.keywords].some((keyword) => normalized.includes(keyword.toLowerCase())),
  );

  return matched ?? { label: input.trim() || "everyday", formality: 3, style: "clean and polished", keywords: [] };
}
