import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VerifiedVenue } from "@/lib/data/verified-venues";

const CATEGORY_BG: Record<string, string> = {
  Restaurant: "bg-orange-100 dark:bg-orange-950",
  Cafe: "bg-amber-100 dark:bg-amber-950",
  "Coworking Space": "bg-sky-100 dark:bg-sky-950",
  Rooftop: "bg-violet-100 dark:bg-violet-950",
  "Event Hall": "bg-emerald-100 dark:bg-emerald-950",
  "Bar & Lounge": "bg-rose-100 dark:bg-rose-950",
};

export function VerifiedVenueCard({ venue }: { venue: VerifiedVenue }) {
  const bg = CATEGORY_BG[venue.category] ?? "bg-muted";
  const content = (
    <div className="group flex flex-col gap-0 rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-background">
      <div className={`relative aspect-video overflow-hidden ${bg}`}>
        <Image
          src={venue.image}
          alt={venue.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute top-2 left-2">
          <Badge
            variant="secondary"
            className="text-[10px] py-0 h-4 backdrop-blur-sm bg-background/80"
          >
            {venue.category}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold leading-snug line-clamp-1">
            {venue.name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {venue.priceRange}
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {venue.description}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-yellow-500">★</span>
          <span className="font-medium text-foreground">{venue.rating}</span>
          <span>({venue.reviewCount}+)</span>
          <span className="text-border">·</span>
          <span className="truncate">{venue.location}</span>
        </div>

        {venue.usedBy.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <ShieldCheck className="size-3 text-primary shrink-0" />
            <span className="text-[10px] text-muted-foreground">Used by</span>
            {venue.usedBy.map((company) => (
              <span
                key={company.name}
                className="text-[10px] font-medium bg-muted border border-border rounded-full px-2 py-0.5 leading-none"
              >
                {company.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (venue.url) {
    return (
      <a
        href={venue.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    );
  }
  return content;
}
