export type OccasionHint = {
  label: string;
  formality: number;
  style: string;
  keywords: string[];
};

const quickHints: OccasionHint[] = [
  { label: "通勤", formality: 3, style: "都市通勤", keywords: ["上班", "办公室", "通勤"] },
  { label: "约会", formality: 3, style: "柔和精致", keywords: ["约会", "见面", "晚餐"] },
  { label: "面试", formality: 4, style: "干练可信", keywords: ["面试", "求职", "offer"] },
  { label: "休闲", formality: 2, style: "轻松舒适", keywords: ["休闲", "周末", "逛街"] },
  { label: "重要会议", formality: 4, style: "克制专业", keywords: ["会议", "客户", "汇报"] },
];

export const occasionTags = quickHints.map((hint) => hint.label);

export function occasionHint(input: string): OccasionHint {
  const normalized = input.trim();
  const matched = quickHints.find((hint) =>
    [hint.label, ...hint.keywords].some((keyword) => normalized.includes(keyword)),
  );

  return matched ?? { label: normalized || "日常", formality: 3, style: "简洁得体", keywords: [] };
}
