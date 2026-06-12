"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, MapPin, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Planner", href: "/", icon: Sparkles },
  { label: "Venues", href: "/venues", icon: MapPin },
  { label: "Caterers", href: "/caterers", icon: UtensilsCrossed },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 bg-muted rounded-full px-1 py-1">
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
