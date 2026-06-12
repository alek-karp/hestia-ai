import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type CateringCardProps = {
  provider: string;
  menu: string[];
  notes: string;
  estimatedCostPerHead: number;
};

export function CateringCard({ provider, menu, notes, estimatedCostPerHead }: CateringCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{provider}</CardTitle>
        <CardDescription>{notes}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {menu.map((item) => (
            <li key={item}>🍽 {item}</li>
          ))}
        </ul>
        <p className="text-xs font-medium">~£{estimatedCostPerHead} per head</p>
      </CardContent>
    </Card>
  );
}
