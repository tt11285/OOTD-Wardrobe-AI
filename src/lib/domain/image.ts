export function isDisplayableImage(src: string | undefined): src is string {
  if (!src) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(src)) {
    return (src.split(",")[1]?.length ?? 0) > 300;
  }
  try {
    const url = new URL(src);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
