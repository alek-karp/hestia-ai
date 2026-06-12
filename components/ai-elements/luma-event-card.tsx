import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export type LumaEventCardProps = {
  area: string;
  date: string;
  description: string;
  headcount: number;
  title: string;
  url: string;
};

export function LumaEventCard({ area, date, description, headcount, title, url }: LumaEventCardProps) {
  return (
    <a href={url} rel="noopener noreferrer" target="_blank">
      <Card className="transition-shadow hover:shadow-md" size="sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle>{title}</CardTitle>
            <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>📅 {date}</span>
          <span>📍 {area}</span>
          <span>👥 {headcount} attendees</span>
        </CardContent>
      </Card>
    </a>
  );
}
