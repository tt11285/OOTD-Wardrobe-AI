"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Grid2X2, Sparkles } from "lucide-react";

const links = [
  { href: "/upload",   label: "建库",  icon: Camera   },
  { href: "/wardrobe", label: "衣橱",  icon: Grid2X2  },
  { href: "/outfits",  label: "搭配",  icon: Sparkles },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="主导航">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`nav-item${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={active ? 2.2 : 1.7} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
