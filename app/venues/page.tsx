"use client";

import { useState } from "react";
import {
  LayoutGrid,
  Utensils,
  Coffee,
  Laptop,
  Sunset,
  PartyPopper,
  Wine,
  MapPin,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VERIFIED_VENUES } from "@/lib/data/verified-venues";
import { VerifiedVenueCard } from "@/components/verified-venue-card";

const CATEGORIES = [
  { label: "All", icon: LayoutGrid },
  { label: "Restaurant", icon: Utensils },
  { label: "Cafe", icon: Coffee },
  { label: "Coworking Space", icon: Laptop },
  { label: "Rooftop", icon: Sunset },
  { label: "Event Hall", icon: PartyPopper },
  { label: "Bar & Lounge", icon: Wine },
] as const;

type Category = (typeof CATEGORIES)[number]["label"];

export default function VenuesPage() {
  const [active, setActive] = useState<Category>("All");

  const filtered =
    active === "All"
      ? VERIFIED_VENUES
      : VERIFIED_VENUES.filter((v) => v.category === active);

  const featured = filtered.filter((v) => v.featured);
  const rest = filtered.filter((v) => !v.featured);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <MapPin className="size-6 text-primary" />
            Verified Venues
          </h1>
          <p className="text-sm text-muted-foreground">
            Handpicked venues trusted by top tech companies.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(({ label, icon: Icon }) => (
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
              {featured.map((venue) => (
                <VerifiedVenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section className="flex flex-col gap-4">
            {(() => {
              const ActiveIcon =
                CATEGORIES.find((c) => c.label === active)?.icon ?? LayoutGrid;
              return (
                <h2 className="text-base font-semibold tracking-tight flex items-center gap-1.5">
                  <ActiveIcon className="size-4 text-muted-foreground" />
                  {active === "All" ? "All Venues" : active}
                </h2>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((venue) => (
                <VerifiedVenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No venues in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}
