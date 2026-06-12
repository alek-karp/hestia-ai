import Image from "next/image";

const BG_COLORS = [
  "bg-orange-100",
  "bg-rose-100",
  "bg-lime-100",
  "bg-yellow-100",
];

const CATERING_IMAGES = [
  "/catering/catering-1.webp",
  "/catering/catering-2.webp",
  "/catering/catering-3.webp",
  "/catering/catering-4.webp",
];

export type CateringOption = {
  provider: string;
  menu?: string[];
  notes: string;
  estimatedCostPerHead?: number;
  url?: string;
  phone?: string;
  email?: string;
};

export type CateringCardProps = {
  options: CateringOption[];
};

export function CateringCard({ options }: CateringCardProps) {
  const shown = options.slice(0, 4);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold tracking-tight">Catering</p>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
        {shown.map((c, i) => (
          <div
            key={`${c.provider}-${i}`}
            className="flex flex-col gap-2 shrink-0 w-48 snap-start"
          >
            <div
              className={`relative aspect-[4/3] rounded-xl overflow-hidden ${BG_COLORS[i % BG_COLORS.length]}`}
            >
              <Image
                src={CATERING_IMAGES[i % CATERING_IMAGES.length]}
                alt={c.provider}
                fill
                className="object-cover"
                sizes="192px"
              />
            </div>
            <div className="flex flex-col gap-0.5 px-0.5">
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold leading-snug hover:underline line-clamp-1"
                >
                  {c.provider}
                </a>
              ) : (
                <span className="text-sm font-semibold leading-snug line-clamp-1">{c.provider}</span>
              )}
              {c.estimatedCostPerHead ? (
                <p className="text-xs font-medium text-muted-foreground">
                  ~${c.estimatedCostPerHead} / head
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground line-clamp-2">{c.notes}</p>
              {(c.phone || c.email) && (
                <div className="flex flex-col gap-0 text-[10px] text-muted-foreground mt-0.5">
                  {c.phone && <span>{c.phone}</span>}
                  {c.email && <span className="truncate">{c.email}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
