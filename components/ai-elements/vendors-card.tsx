import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type Vendor = {
  category: string;
  name: string;
  notes: string;
};

export type VendorsCardProps = {
  vendors: Vendor[];
};

export function VendorsCard({ vendors }: VendorsCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Suggested Vendors</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {vendors.map((vendor) => (
          <div className="flex flex-col gap-0.5" key={vendor.category}>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{vendor.category}</Badge>
              <span className="text-sm font-medium">{vendor.name}</span>
            </div>
            <p className="text-xs text-muted-foreground pl-1">{vendor.notes}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
