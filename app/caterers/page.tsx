"use client";

import { useState } from "react";
import {
  LayoutGrid,
  Leaf,
  Flame,
  Waves,
  Crown,
  Heart,
  UtensilsCrossed,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VERIFIED_CATERERS } from "@/lib/data/verified-caterers";
import { VerifiedCatererCard } from "@/components/verified-caterer-card";

const CUISINES = [
  { label: "All", icon: LayoutGrid },
  { label: "Farm-to-Table", icon: Leaf },
  { label: "Asian Fusion", icon: Flame },
  { label: "Mediterranean", icon: Waves },
  { label: "Fine Dining", icon: Crown },
  { label: "Health & Wellness", icon: Heart },
] as const;

type Cuisine = (typeof CUISINES)[number]["label"];

export default function CaterersPage() {
  const [active, setActive] = useState<Cuisine>("All");

  const filtered =
    active === "All"
      ? VERIFIED_CATERERS
      : VERIFIED_CATERERS.filter((c) => c.cuisine === active);

  const featured = filtered.filter((c) => c.featured);
  const rest = filtered.filter((c) => !c.featured);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="size-6 text-primary" />
            Verified Caterers
          </h1>
          <p className="text-sm text-muted-foreground">
            Curated catering partners trusted by top tech companies.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {CUISINES.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setActive(label)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                active === label
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {featured.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold tracking-tight flex items-center gap-1.5">
              <Star className="size-4 text-yellow-500 fill-yellow-500" />
              Featured
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((caterer) => (
                <VerifiedCatererCard key={caterer.id} caterer={caterer} />
              ))}
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section className="flex flex-col gap-4">
            {(() => {
              const ActiveIcon =
                CUISINES.find((c) => c.label === active)?.icon ?? LayoutGrid;
              return (
                <h2 className="text-base font-semibold tracking-tight flex items-center gap-1.5">
                  <ActiveIcon className="size-4 text-muted-foreground" />
                  {active === "All" ? "All Caterers" : active}
                </h2>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((caterer) => (
                <VerifiedCatererCard key={caterer.id} caterer={caterer} />
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No caterers in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}
