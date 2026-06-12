import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VerifiedCaterer } from "@/lib/data/verified-caterers";

const CUISINE_BG: Record<string, string> = {
  "Farm-to-Table": "bg-lime-100 dark:bg-lime-950",
  "Asian Fusion": "bg-orange-100 dark:bg-orange-950",
  Mediterranean: "bg-sky-100 dark:bg-sky-950",
  Mexican: "bg-yellow-100 dark:bg-yellow-950",
  "Fine Dining": "bg-violet-100 dark:bg-violet-950",
  "Health & Wellness": "bg-emerald-100 dark:bg-emerald-950",
  "American BBQ": "bg-red-100 dark:bg-red-950",
  "Desserts & Pastry": "bg-pink-100 dark:bg-pink-950",
};

export function VerifiedCatererCard({ caterer }: { caterer: VerifiedCaterer }) {
  const bg = CUISINE_BG[caterer.cuisine] ?? "bg-muted";
  const content = (
    <div className="group flex flex-col gap-0 rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-background">
      <div className={`relative aspect-video overflow-hidden ${bg}`}>
        <Image
          src={caterer.image}
          alt={caterer.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute top-2 left-2">
          <Badge
            variant="secondary"
            className="text-[10px] py-0 h-4 backdrop-blur-sm bg-background/80"
          >
            {caterer.cuisine}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold leading-snug line-clamp-1">
            {caterer.name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            ${caterer.estimatedCostPerHead}/head
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {caterer.description}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-yellow-500">★</span>
          <span className="font-medium text-foreground">{caterer.rating}</span>
          <span>({caterer.reviewCount}+)</span>
          <span className="text-border">·</span>
          <span className="truncate">{caterer.location}</span>
        </div>

        {caterer.usedBy.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <ShieldCheck className="size-3 text-primary shrink-0" />
            <span className="text-[10px] text-muted-foreground">Used by</span>
            {caterer.usedBy.map((company) => (
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

  if (caterer.url) {
    return (
      <a
        href={caterer.url}
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
