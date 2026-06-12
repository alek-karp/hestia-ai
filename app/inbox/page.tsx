"use client";

import {
  Inbox as InboxIcon,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ThreadDetail, ThreadSummary } from "@/lib/emails";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function InboxPage() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/emails/replies");
      const data = (await res.json()) as { threads: ThreadSummary[] };
      setThreads(data.threads ?? []);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const openThread = useCallback(async (threadId: string) => {
    setActiveId(threadId);
    setThread(null);
    setDraft("");
    setLoadingThread(true);
    try {
      const res = await fetch(
        `/api/emails/replies?threadId=${encodeURIComponent(threadId)}`,
      );
      setThread((await res.json()) as ThreadDetail);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const generateDraft = async () => {
    if (!activeId) return;
    setDrafting(true);
    try {
      const res = await fetch("/api/emails/replies/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeId }),
      });
      const data = (await res.json()) as { text?: string };
      if (data.text) setDraft(data.text);
    } finally {
      setDrafting(false);
    }
  };

  const sendReply = async () => {
    if (!activeId || !draft.trim()) return;
    setSending(true);
    try {
      await fetch("/api/emails/replies/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeId, text: draft }),
      });
      setDraft("");
      await openThread(activeId);
      await loadThreads();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex">
      {/* Thread list */}
      <aside className="w-72 sm:w-80 shrink-0 border-r flex flex-col min-h-0">
        <div className="h-12 px-4 shrink-0 border-b flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-2">
            <InboxIcon className="size-4 text-primary" />
            Vendor Replies
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={loadThreads}
            disabled={loadingList}
          >
            <RefreshCw
              className={cn("size-3.5", loadingList && "animate-spin")}
            />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList && threads.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : threads.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No conversations yet. Send outreach, then replies appear here.
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.threadId}
                type="button"
                onClick={() => openThread(t.threadId)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors flex flex-col gap-1",
                  activeId === t.threadId && "bg-muted",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {t.subject}
                  </span>
                  {t.awaitingReply && (
                    <Badge variant="default" className="shrink-0 text-[10px]">
                      New
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate">
                  {t.preview}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t.messageCount} message{t.messageCount === 1 ? "" : "s"} ·{" "}
                  {timeAgo(t.updatedAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Thread detail + draft */}
      <section className="flex-1 min-h-0 flex flex-col">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Mail className="size-8" />
            <p className="text-sm">Select a conversation to view and reply.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loadingThread || !thread ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="max-w-2xl mx-auto flex flex-col gap-4">
                  <h1 className="text-lg font-semibold">{thread.subject}</h1>
                  {thread.messages.map((m) => (
                    <div
                      key={m.messageId}
                      className={cn(
                        "rounded-lg border p-4 text-sm whitespace-pre-wrap",
                        m.outbound
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/40",
                      )}
                    >
                      <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {m.outbound ? "Hestia (us)" : m.from}
                        </span>
                        <span>{timeAgo(m.timestamp)}</span>
                      </div>
                      {m.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Draft composer */}
            <div className="shrink-0 border-t p-4">
              <div className="max-w-2xl mx-auto flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Your reply (review before sending)
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={generateDraft}
                    disabled={drafting || loadingThread}
                  >
                    {drafting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    {drafting ? "Drafting…" : "AI draft"}
                  </Button>
                </div>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a reply, or generate one with AI…"
                  className="min-h-24 resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={sendReply}
                    disabled={sending || !draft.trim()}
                  >
                    {sending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    {sending ? "Sending…" : "Send reply"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
