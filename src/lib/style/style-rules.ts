import type { OccasionHint } from "@/lib/domain/occasion";

export const stylePrinciples = [
  "全身主色不超过三种，优先保持干净和呼吸感。",
  "正式场合优先选择衬衫、西装外套、直筒裤、乐福鞋等利落单品。",
  "休闲场合可以降低正式度，但保留一个精致锚点，比如皮鞋、腰带或挺括外套。",
  "上宽下窄或上短下长可以让比例更清楚。",
  "面试和重要会议避免过强图案，选择低饱和中性色更稳。",
];

export function stylePromptContext(hint: OccasionHint): string {
  return [
    `场合风格：${hint.style}`,
    `目标正式度：${hint.formality}`,
    "搭配原则：",
    ...stylePrinciples.map((rule, index) => `${index + 1}. ${rule}`),
  ].join("\n");
}
