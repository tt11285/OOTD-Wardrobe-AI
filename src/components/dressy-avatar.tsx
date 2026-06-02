// Dressy — the stylist persona's avatar. Pure inline SVG (no external image,
// vector-crisp, theme-colored). Two variants:
//   "mark"     — minimalist serif "D" logomark on a terracotta disc (brand)
//   "portrait" — line-art fashion portrait (warm, story-telling)

export function DressyAvatar({
  variant = "portrait",
  size = 48,
  className,
}: {
  variant?: "mark" | "portrait";
  size?: number;
  className?: string;
}) {
  if (variant === "mark") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        className={className}
        role="img"
        aria-label="Dressy"
      >
        <circle cx="24" cy="24" r="24" fill="var(--accent, #b07050)" />
        <text
          x="24"
          y="33"
          textAnchor="middle"
          fontFamily="var(--font-serif, Georgia, serif)"
          fontSize="26"
          fontWeight="500"
          fill="#fffcf9"
        >
          D
        </text>
      </svg>
    );
  }

  // Portrait — soft line-art fashion bust on a cream disc with terracotta lines.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Dressy"
    >
      <circle cx="32" cy="32" r="32" fill="#f1e9df" />
      <g fill="none" stroke="var(--accent-strong, #7a3f2e)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {/* hair sweep */}
        <path d="M20 30c-1-9 5-16 13-16s12 6 12 14c0 3-.6 6-1.4 8" />
        {/* face profile */}
        <path d="M40 22c2 1.4 3 4 2.7 7-.2 2-.2 3.4 1 4.4-1 .8-2.2 1-3.4.8" />
        <path d="M40 36c-.6 2.6-3 4.4-6 4.4-2 0-3.8-.7-5-1.9" />
        {/* eye + brow */}
        <path d="M34.5 27.5h3.2" />
        <circle cx="36" cy="30.4" r="0.9" fill="var(--accent-strong, #7a3f2e)" stroke="none" />
        {/* lips */}
        <path d="M39.4 33.6c.9.3 1.6.3 2.3 0" />
        {/* neck + shoulders */}
        <path d="M30 41v4c0 2-1.4 3.4-4 4" />
        <path d="M18 52c1.5-4 6-6.5 12-6.5S40.5 48 43 52" />
        {/* hair behind */}
        <path d="M22 30c-2 4-2 9 0 14" />
      </g>
    </svg>
  );
}
