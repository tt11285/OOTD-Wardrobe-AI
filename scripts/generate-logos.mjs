// One-off: generate several OOTD/Dressy logo concepts via Gemini, saved locally
// to ~/ootd-logo-*.png for review.  NODE_USE_ENV_PROXY=1 node scripts/generate-logos.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "..", ".env.local"), "utf8")
    .split("\n").filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const KEY = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
const MODEL = env.OOTD_IMAGE_EDIT_MODEL || "gemini-2.5-flash-image";

const COMMON = "Flat vector app logo, 512x512, centered, clean. Warm palette: cream (#f9f6f2) and deep warm black (#1c1916) with terracotta (#b07050) accent. Minimal, premium, fashion-brand quality. Solid background. No photorealism, no extra text, no watermark.";

const CONCEPTS = {
  wordmark: `Elegant serif monogram wordmark logo for a fashion app called "OOTD". The four letters OOTD set in a refined Playfair-style serif, perfectly balanced, terracotta and black on cream. ${COMMON}`,
  "d-hanger": `Minimal logo: a single letter "D" where the top of the D is shaped like a clothes hanger hook, cleverly suggesting a stylist. Terracotta D on a soft cream rounded-square background. ${COMMON}`,
  hanger: `Minimal icon logo: one elegant clothes hanger drawn in clean thin lines, inside a terracotta circle on cream. Chic, simple, fashion-forward. ${COMMON}`,
  sparkle: `Minimal logo combining a clothes hanger with a small sparkle/star accent, suggesting AI styling magic. Thin terracotta lines on cream rounded square. ${COMMON}`,
};

async function gen(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const res = await fetch(url, {
    method: "POST", signal: AbortSignal.timeout(60000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 0.7 } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const data = await res.json();
  for (const p of data?.candidates?.[0]?.content?.parts ?? []) {
    const d = p.inlineData?.data ?? p.inline_data?.data;
    if (d && d.length > 1000) return Buffer.from(d, "base64");
  }
  throw new Error("no image");
}

if (!KEY) { console.error("Missing GEMINI_API_KEY"); process.exit(1); }
for (const [name, prompt] of Object.entries(CONCEPTS)) {
  try {
    const buf = await gen(prompt);
    const out = resolve(homedir(), `ootd-logo-${name}.png`);
    writeFileSync(out, buf);
    console.log(`✅ ${out} (${buf.length}b)`);
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
  }
}
