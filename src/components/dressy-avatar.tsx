import { SafeImage } from "@/components/safe-image";

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
      <SafeImage
        src="/images/dressy.png"
        alt="Dressy"
        width={size}
        height={size}
        loading="lazy"
        fallback={<span className="dressy-avatar-fallback" aria-hidden="true">D</span>}
      />
    </span>
  );
}
