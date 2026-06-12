"use client";

import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookingPanel } from "@/components/booking-panel-context";

export function BookingPanelToggle() {
  const { panelOpen, hasPlan, togglePanel } = useBookingPanel();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="gap-1.5 text-xs text-muted-foreground"
      onClick={togglePanel}
      disabled={!hasPlan}
      type="button"
    >
      {panelOpen ? (
        <PanelRightClose className="size-4" />
      ) : (
        <PanelRightOpen className="size-4" />
      )}
      {!hasPlan ? "No event yet" : panelOpen ? "Close Event" : "Open Event"}
    </Button>
  );
}
