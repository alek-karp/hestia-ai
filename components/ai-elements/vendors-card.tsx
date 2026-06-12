import { Badge } from "@/components/ui/badge";

export type Vendor = {
  category: string;
  name: string;
  notes: string;
  url?: string;
  phone?: string;
  email?: string;
};

export type VendorsCardProps = {
  vendors: Vendor[];
};

const BG_COLORS = [
  "bg-amber-100",
  "bg-sky-100",
  "bg-emerald-100",
  "bg-rose-100",
  "bg-violet-100",
  "bg-yellow-100",
];

const CATEGORY_ICONS: Record<string, string> = {
  Venue: "🏛",
  "AV & Tech": "🎤",
  Photography: "📸",
  Florals: "💐",
};

export function VendorsCard({ vendors }: VendorsCardProps) {
  const shown = vendors.slice(0, 4);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold tracking-tight">Venues &amp; Vendors</p>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
        {shown.map((vendor, i) => (
          <div
            key={`${vendor.category}-${i}`}
            className="flex flex-col gap-2 shrink-0 w-48 snap-start"
          >
            <div
              className={`relative aspect-[4/3] rounded-xl ${BG_COLORS[i % BG_COLORS.length]} flex items-center justify-center`}
            >
              <span className="text-4xl opacity-50 select-none">
                {CATEGORY_ICONS[vendor.category] ?? "🏢"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 px-0.5">
              <Badge variant="secondary" className="self-start text-[10px] py-0 h-4">
                {vendor.category}
              </Badge>
              {vendor.url ? (
                <a
                  href={vendor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold leading-snug hover:underline line-clamp-1"
                >
                  {vendor.name}
                </a>
              ) : (
                <span className="text-sm font-semibold leading-snug line-clamp-1">{vendor.name}</span>
              )}
              <p className="text-xs text-muted-foreground line-clamp-2">{vendor.notes}</p>
              {(vendor.phone || vendor.email) && (
                <div className="flex flex-col gap-0 text-[10px] text-muted-foreground mt-0.5">
                  {vendor.phone && <span>{vendor.phone}</span>}
                  {vendor.email && <span className="truncate">{vendor.email}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
