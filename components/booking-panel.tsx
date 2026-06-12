"use client";

import { CheckCircle2, Phone, Calendar, Clock, MapPin, Users, Utensils, Building2, Camera, Loader2 } from "lucide-react";
import { useBookingPanel } from "@/components/booking-panel-context";

type BookingStatus = "idle" | "dispatching" | "confirmed";

interface BookingSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  name?: string;
  detail?: string;
  status: BookingStatus;
}

function StatusBadge({ status }: { status: BookingStatus }) {
  if (status === "dispatching") {
    return (
      <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
        <Loader2 className="size-3 animate-spin" />
        Searching…
      </div>
    );
  }
  if (status === "confirmed") {
    return (
      <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
        <CheckCircle2 className="size-3" />
        Found
      </div>
    );
  }
  return (
    <span className="text-[10px] text-muted-foreground">Not started</span>
  );
}

function SectionCard({ section }: { section: BookingSection }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {section.icon}
          {section.label}
        </div>
        <StatusBadge status={section.status} />
      </div>
      {section.name ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold leading-snug">{section.name}</span>
          {section.detail && (
            <span className="text-xs text-muted-foreground">{section.detail}</span>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">
          {section.status === "dispatching" ? "Searching…" : "Pending…"}
        </span>
      )}
    </div>
  );
}

export function BookingPanel({ onClose }: { onClose?: () => void }) {
  const { eventPlan } = useBookingPanel();

  if (!eventPlan) return null;

  const { title, date, area, headcount, isDispatching, venue, catering, lumaEvent } = eventPlan;

  const sections: BookingSection[] = [
    {
      id: "venue",
      label: "Venue",
      icon: <Building2 className="size-3.5" />,
      name: venue?.name,
      detail: venue?.detail,
      status: venue ? "confirmed" : isDispatching ? "dispatching" : "idle",
    },
    {
      id: "catering",
      label: "Catering",
      icon: <Utensils className="size-3.5" />,
      name: catering?.name,
      detail: catering?.detail,
      status: catering ? "confirmed" : isDispatching ? "dispatching" : "idle",
    },
    {
      id: "luma",
      label: "Event Page",
      icon: <Camera className="size-3.5" />,
      name: lumaEvent?.title,
      detail: lumaEvent?.url,
      status: lumaEvent ? "confirmed" : isDispatching ? "dispatching" : "idle",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3 shrink-0" />
            {date || "TBD"}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {area || "TBD"}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-2">
            <Users className="size-3 shrink-0" />
            {headcount} attendees
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
