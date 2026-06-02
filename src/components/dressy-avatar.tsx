// Dressy — the stylist persona's avatar. A real fashion-stylist portrait photo
// (generated once via scripts/generate-dressy-avatar.mjs, stored in Supabase).
// Falls back to a serif "D" monogram disc if the image can't load.

const AVATAR_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/wardrobe-images/dressy/avatar.png`
  : "";

export function DressyAvatar({
  size = 48,
  className,
}: {
  /** Kept for backward compat; the photo avatar ignores variant. */
  variant?: "mark" | "portrait";
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`dressy-avatar${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Dressy, your stylist"
    >
      {AVATAR_URL ? (
        <img src={AVATAR_URL} alt="Dressy" width={size} height={size} loading="lazy" />
      ) : (
        <span className="dressy-avatar-fallback" aria-hidden="true">D</span>
      )}
    </span>
  );
}
