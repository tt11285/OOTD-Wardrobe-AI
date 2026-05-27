import type { StoredClothingItem } from "@/lib/storage/repository";
import { occasionHint } from "@/lib/domain/occasion";
import { stylePromptContext } from "@/lib/style/style-rules";

export function recognitionPrompt(): string {
  return [
    "你是专业服装识别助手。",
    "识别图片中的衣物，输出 JSON 数组。",
    "每件衣物必须包含 name, category, colors, style_tags, season, formality, confidence。",
    "category 只能是 top, bottom, outer, shoes, accessory。",
  ].join("\n");
}

export function outfitPrompt(items: StoredClothingItem[], occasion: string): string {
  const hint = occasionHint(occasion);

  return [
    "你是一位专业个人形象顾问，审美偏向法式极简和都市通勤。",
    stylePromptContext(hint),
    "用户衣橱：",
    JSON.stringify(items, null, 2),
    `今日场合：${occasion}`,
    "请输出 2-3 套搭配，每套只能引用用户衣橱里的 id。",
  ].join("\n\n");
}
