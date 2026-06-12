"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EmailVendorButton() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const handleClick = async () => {
    setStatus("sending");
    try {
      await fetch("/api/emails/outreach", { method: "POST" });
      setStatus("sent");
    } catch {
      setStatus("idle");
    }
  };

  return (
    <Button
      size="sm"
      variant={status === "sent" ? "outline" : "default"}
      disabled={status !== "idle"}
      onClick={handleClick}
      className="gap-1.5"
    >
      <Mail className="size-3.5" />
      {status === "sending"
        ? "Emailing…"
        : status === "sent"
          ? "Emailed"
          : "Email Vendor"}
    </Button>
  );
}
