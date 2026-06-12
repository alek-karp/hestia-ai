"use client";

import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookingPanel } from "@/components/booking-panel-context";

export function WorkflowToggle() {
  const { workflowOpen, toggleWorkflow } = useBookingPanel();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="gap-1.5 text-xs text-muted-foreground"
      onClick={toggleWorkflow}
      type="button"
    >
      {workflowOpen ? (
        <PanelRightClose className="size-4" />
      ) : (
        <PanelRightOpen className="size-4" />
      )}
      Workflow
    </Button>
  );
}
