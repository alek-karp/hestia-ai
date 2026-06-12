import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function VendorsCard({ vendors }: VendorsCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Venue Options</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {vendors.map((vendor) => (
          <div className="flex flex-col gap-0.5" key={vendor.category}>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{vendor.category}</Badge>
              {vendor.url ? (
                <a href={vendor.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline underline-offset-2">
                  {vendor.name}
                </a>
              ) : (
                <span className="text-sm font-medium">{vendor.name}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground pl-1">{vendor.notes}</p>
            {(vendor.phone || vendor.email) && (
              <div className="flex gap-3 pl-1 text-xs text-muted-foreground">
                {vendor.phone && <span>📞 {vendor.phone}</span>}
                {vendor.email && <span>✉ {vendor.email}</span>}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
