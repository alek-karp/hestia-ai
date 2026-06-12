"use client";

import { DatabaseZap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type TestResult = {
  ok: boolean;
  recordCount: number;
  result?: {
    background?: { error?: string };
  };
};

export function AirbyteTestButton() {
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("Test Airbyte");

  const handleClick = async () => {
    setStatus("testing");
    setMessage("Testing...");

    try {
      const res = await fetch("/api/airbyte/test", { method: "POST" });
      const data = (await res.json()) as TestResult;

      if (!res.ok || !data.ok) {
        const error =
          data.result?.background?.error ?? `Request failed with ${res.status}`;
        setStatus("error");
        setMessage(error.slice(0, 44));
        return;
      }

      setStatus("ok");
      setMessage(`${data.recordCount} records`);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message.slice(0, 44) : "Failed",
      );
    }
  };

  return (
    <Button
      className="gap-1.5"
      disabled={status === "testing"}
      onClick={handleClick}
      size="sm"
      title={message}
      variant={status === "ok" ? "outline" : "default"}
    >
      <DatabaseZap className="size-3.5" />
      {status === "testing" ? "Airbyte..." : message}
    </Button>
  );
}
