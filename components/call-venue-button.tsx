"use client";

import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { useState } from "react";

export function CallVenueButton() {
  const [status, setStatus] = useState<"idle" | "calling" | "called">("idle");

  const handleClick = async () => {
    setStatus("calling");
    try {
      await fetch("/api/calls/venue", { method: "POST" });
      setStatus("called");
    } catch {
      setStatus("idle");
    }
  };

  return (
    <Button
      size="sm"
      variant={status === "called" ? "outline" : "default"}
      disabled={status !== "idle"}
      onClick={handleClick}
      className="gap-1.5"
    >
      <Phone className="size-3.5" />
      {status === "calling" ? "Calling…" : status === "called" ? "Called" : "Call Venue"}
    </Button>
  );
}
