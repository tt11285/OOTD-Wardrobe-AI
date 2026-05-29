"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/upload", label: "ADD" },
  { href: "/wardrobe", label: "WARDROBE" },
  { href: "/outfits", label: "OUTFITS" },
];

// Desktop-only primary navigation. Hidden on mobile (bottom nav takes over).
export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="top-nav">
      <nav className="top-nav-inner" aria-label="Primary">
        <Link href="/" className={`top-nav-brand${pathname === "/" ? " active" : ""}`}>
          OOTD
        </Link>
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`top-nav-link${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
