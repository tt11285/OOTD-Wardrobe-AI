// One-shot probe to verify Gemini 2.5 Flash Image works with the configured
// API key. Sends a tiny synthetic shirt-like image and asks the model to
// "extract clothing on white background". Prints the result size + saves the
// returned image to /tmp/gemini-probe-out.png for visual inspection.
//
// Usage:  node scripts/probe-gemini-image.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "..", ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ Missing GEMINI_API_KEY / GOOGLE_API_KEY in .env.local");
  process.exit(1);
}

const model = process.env.PROBE_MODEL || env.OOTD_IMAGE_EDIT_MODEL || "gemini-2.5-flash-image";
const baseUrl = env.OOTD_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/models";

// ── Build a 256×256 solid-blue PNG so we have a real (if boring) input image
function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function makePng(w, h, rgb) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) {
    row[1 + x * 3] = rgb[0]; row[1 + x * 3 + 1] = rgb[1]; row[1 + x * 3 + 2] = rgb[2];
  }
  const raw = Buffer.alloc(h * row.length);
  for (let y = 0; y < h; y++) row.copy(raw, y * row.length);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// Accept a real image path as the first CLI arg; otherwise use the synthetic
// navy square (which the model will correctly refuse — useful only to confirm
// the endpoint/auth/billing are live).
const inputPath = process.argv[2];
let inputBuf;
let inputMime;
if (inputPath) {
  inputBuf = readFileSync(resolve(process.cwd(), inputPath));
  inputMime = inputPath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  console.log(`📥 Input: real file ${inputPath}, ${inputBuf.length} bytes (${inputMime})`);
} else {
  inputBuf = makePng(256, 256, [53, 68, 107]); // navy blue
  inputMime = "image/png";
  console.log(`📥 Input: 256×256 navy PNG (synthetic), ${inputBuf.length} bytes`);
}
const base64 = inputBuf.toString("base64");
console.log(`🎯 Model: ${model}`);
console.log(`🌐 Endpoint: ${baseUrl}/${model}:generateContent`);
console.log(`🔑 Key: ${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`);

const url = `${baseUrl}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

const prompt = [
  "Task: Extract the clothing item from this photo.",
  "Remove all background. Place the garment on a clean PURE WHITE background.",
  "If the garment is folded or partially hidden, reconstruct it as a full flat-lay product photo.",
  "Preserve color and pattern accurately.",
].join("\n");

const startedAt = Date.now();
const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { inline_data: { mime_type: inputMime, data: base64 } },
      ],
    }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 0.15,
    },
  }),
});

const elapsed = Date.now() - startedAt;
console.log(`\n⏱️  HTTP ${response.status} in ${elapsed}ms`);

if (!response.ok) {
  const body = await response.text();
  console.error("❌ Request failed:");
  console.error(body.slice(0, 1500));
  process.exit(1);
}

const payload = await response.json();

const parts = payload.candidates?.[0]?.content?.parts ?? [];
console.log(`\n📦 Response had ${parts.length} part(s)`);

let foundImage = false;
for (const [i, part] of parts.entries()) {
  if (part.text) {
    console.log(`   [${i}] text: "${part.text.slice(0, 200)}${part.text.length > 200 ? "…" : ""}"`);
  }
  const blob = part.inlineData ?? part.inline_data;
  if (blob?.data) {
    const outBuf = Buffer.from(blob.data, "base64");
    const outMime = blob.mimeType ?? blob.mime_type ?? "image/png";
    const ext = outMime.includes("png") ? "png" : "jpg";
    const outPath = `/tmp/gemini-probe-out.${ext}`;
    writeFileSync(outPath, outBuf);
    console.log(`   [${i}] image: ${outBuf.length} bytes (${outMime}) → saved to ${outPath}`);
    foundImage = true;
  }
}

if (!foundImage) {
  console.error("\n❌ Response had NO image data. Full payload:");
  console.error(JSON.stringify(payload, null, 2).slice(0, 2000));
  process.exit(1);
}

console.log(`\n✨ Probe succeeded — endpoint + model + key all work.`);
