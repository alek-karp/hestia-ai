import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type CateringOption = {
  provider: string;
  notes: string;
  url?: string;
  phone?: string;
  email?: string;
};

export type CateringCardProps = {
  options: CateringOption[];
};

export function CateringCard({ options }: CateringCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Catering Options</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {options.map((c) => (
          <div key={c.provider} className="flex flex-col gap-1">
            {c.url ? (
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline underline-offset-2">
                {c.provider}
              </a>
            ) : (
              <span className="text-sm font-medium">{c.provider}</span>
            )}
            <p className="text-xs text-muted-foreground">{c.notes}</p>
            {(c.phone || c.email) && (
              <div className="flex gap-3 text-xs text-muted-foreground">
                {c.phone && <span>📞 {c.phone}</span>}
                {c.email && <span>✉ {c.email}</span>}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
