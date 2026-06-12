"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useState } from "react";
import {
  Agent,
  AgentContent,
  AgentHeader,
} from "@/components/ai-elements/agent";
import { AgentAvatar } from "@/components/ai-elements/agent-avatar";
import { CateringCard } from "@/components/ai-elements/catering-card";
import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextTrigger,
} from "@/components/ai-elements/context";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { LumaEventCard } from "@/components/ai-elements/luma-event-card";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  Plan,
  PlanContent,
  PlanDescription,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { QuickReplies } from "@/components/ai-elements/suggestion";
import { VendorsCard } from "@/components/ai-elements/vendors-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const YES_NO_PATTERN =
  /\b(would you like|do you want|do you need|shall i|should i|are you|is (that|this)|can i|would that|does that|will you|have you)\b.*\?$/i;

function detectYesNo(text: string): boolean {
  const trimmed = text.trim();
  return YES_NO_PATTERN.test(trimmed) || /\(yes\s*\/\s*no\)/i.test(trimmed);
}

const MODELS = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai" as const,
    maxTokens: 128000,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "openai" as const,
    maxTokens: 128000,
  },
];

const hestiaAvatar = (
  <AgentAvatar alt="Hestia" background="#F9CA24" src="/avatars/hestia.png" />
);

export default function ChatPage() {
  const [text, setText] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(MODELS[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  const modelIdRef = useRef(selectedModelId);
  modelIdRef.current = selectedModelId;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/chat",
      body: () => ({ modelId: modelIdRef.current }),
    }),
  });

  const selectedModel =
    MODELS.find((m) => m.id === selectedModelId) ?? MODELS[0];
  const usedTokens = messages.reduce(
    (acc, m) =>
      acc +
      m.parts.reduce((s, p) => s + (p.type === "text" ? p.text.length : 0), 0),
    0,
  );
  const isStreaming = status === "streaming" || status === "submitted";

  const lastAssistantMsg = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const lastAssistantText =
    lastAssistantMsg?.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("") ?? "";
  const showYesNo =
    !isStreaming &&
    !!lastAssistantMsg &&
    detectYesNo(lastAssistantText) &&
    lastAssistantMsg.id === messages[messages.length - 1]?.id;

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim()) return;
    sendMessage({ text: message.text });
    setText("");
  };

  return (
    <div className="flex flex-col h-full w-full">
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="px-4 py-6 max-w-3xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <AgentAvatar
                alt="Hestia"
                background="#F9CA24"
                className="size-20"
                size={80}
                src="/avatars/hestia.png"
              />
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold tracking-tight">
                  Hail, traveller.
                </h2>
                <p className="text-muted-foreground text-sm">
                  What event shall we bring to life?
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                key={msg.id}
              >
                {msg.role === "assistant" && hestiaAvatar}
                <Message from={msg.role}>
                  <MessageContent>
                    {msg.parts.map((part, i) => {
                      if (part.type === "text") {
                        return (
                          <MessageResponse key={i}>{part.text}</MessageResponse>
                        );
                      }
                      if (part.type === "tool-create_event_plan") {
                        const p = part as typeof part & {
                          state:
                            | "input-streaming"
                            | "input-available"
                            | "output-available";
                          input: {
                            title: string;
                            description: string;
                            headcount: number;
                            area: string;
                            date: string;
                            food: string;
                            lumaPage: boolean;
                            steps: { title: string; description: string }[];
                          };
                          output?: {
                            lumaEvent: {
                              url: string;
                              title: string;
                              description: string;
                              date: string;
                              area: string;
                              headcount: number;
                            } | null;
                            catering: {
                              provider: string;
                              menu: string[];
                              notes: string;
                              estimatedCostPerHead: number;
                              url?: string;
                              phone?: string;
                              email?: string;
                            }[];
                            vendors: {
                              vendors: {
                                category: string;
                                name: string;
                                notes: string;
                                url?: string;
                                phone?: string;
                                email?: string;
                              }[];
                            };
                          };
                        };
                        const streaming = p.state === "input-streaming";
                        const dispatching = p.state === "input-available";
                        const done = p.state === "output-available";
                        const input = p.input ?? {};

                        const subagents = [
                          {
                            name: "Apollo",
                            label: "Creating event page",
                            src: "/avatars/apollo.png",
                            bg: "#FDE68A",
                          },
                          {
                            name: "Demeter",
                            label: "Sourcing catering",
                            src: "/avatars/demeter.png",
                            bg: "#BBF7D0",
                          },
                          {
                            name: "Artemis",
                            label: "Finding vendors",
                            src: "/avatars/artemis.png",
                            bg: "#C7D2FE",
                          },
                        ];

                        return (
                          <div className="flex flex-col gap-3" key={i}>
                            <Plan defaultOpen isStreaming={streaming}>
                              <PlanHeader>
                                <div>
                                  <PlanTitle>
                                    {input.title ?? "Event Plan"}
                                  </PlanTitle>
                                  <PlanDescription>
                                    {input.description ?? " "}
                                  </PlanDescription>
                                </div>
                                <PlanTrigger />
                              </PlanHeader>
                              <PlanContent>
                                <div className="flex flex-col gap-3 text-sm">
                                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                    <span>👥 {input.headcount} attendees</span>
                                    <span>📍 {input.area}</span>
                                    <span>📅 {input.date}</span>
                                    <span>🍽 {input.food}</span>
                                  </div>
                                  {(input.steps ?? []).length > 0 && (
                                    <ol className="flex flex-col gap-2 mt-1">
                                      {input.steps.map((step, si) => (
                                        <li
                                          className="flex flex-col gap-0.5"
                                          key={si}
                                        >
                                          <span className="font-medium">
                                            {si + 1}. {step.title}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {step.description}
                                          </span>
                                        </li>
                                      ))}
                                    </ol>
                                  )}
                                </div>
                              </PlanContent>
                            </Plan>

                            {(dispatching || done) && (
                              <div className="flex flex-col gap-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Subagents
                                </p>
                                <div className="flex flex-col gap-2">
                                  {subagents.map(({ name, label, src, bg }) => (
                                    <Agent key={name}>
                                      <AgentHeader
                                        name={name}
                                        model={
                                          dispatching ? "Running…" : "Done"
                                        }
                                        avatar={
                                          <AgentAvatar
                                            alt={name}
                                            background={bg}
                                            src={src}
                                            size={24}
                                          />
                                        }
                                      />
                                      <AgentContent className="pb-3 pt-0">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          {dispatching && (
                                            <Spinner className="size-3 shrink-0" />
                                          )}
                                          {label}
                                        </div>
                                      </AgentContent>
                                    </Agent>
                                  ))}
                                </div>
                              </div>
                            )}

                            {p.output?.lumaEvent && (
                              <LumaEventCard
                                area={p.output.lumaEvent.area}
                                date={p.output.lumaEvent.date}
                                description={p.output.lumaEvent.description}
                                headcount={p.output.lumaEvent.headcount}
                                title={p.output.lumaEvent.title}
                                url={p.output.lumaEvent.url}
                              />
                            )}
                            {p.output?.catering &&
                              Array.isArray(p.output.catering) && (
                                <CateringCard options={p.output.catering} />
                              )}
                            {p.output?.vendors && (
                              <VendorsCard vendors={p.output.vendors.vendors} />
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </MessageContent>
                  {showYesNo && msg.id === lastAssistantMsg?.id && (
                    <QuickReplies
                      replies={["Yes", "No"]}
                      onReply={(r) => {
                        sendMessage({ text: r });
                        setText("");
                      }}
                    />
                  )}
                </Message>
              </div>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background px-4 py-4">
        <PromptInput
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto w-full"
        >
          <PromptInputBody>
            <PromptInputTextarea
              value={text}
              placeholder="Message..."
              onChange={(e) => setText(e.target.value)}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <ModelSelector
                open={modelSelectorOpen}
                onOpenChange={setModelSelectorOpen}
              >
                <ModelSelectorTrigger asChild>
                  <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    className="gap-1.5 text-xs text-muted-foreground"
                  >
                    <ModelSelectorLogo provider={selectedModel.provider} />
                    {selectedModel.name}
                  </Button>
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput placeholder="Search models..." />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                    <ModelSelectorGroup heading="Models">
                      {MODELS.map((model) => (
                        <ModelSelectorItem
                          key={model.id}
                          value={model.id}
                          onSelect={() => {
                            setSelectedModelId(model.id);
                            setModelSelectorOpen(false);
                          }}
                        >
                          <ModelSelectorLogo provider={model.provider} />
                          <ModelSelectorName>{model.name}</ModelSelectorName>
                        </ModelSelectorItem>
                      ))}
                    </ModelSelectorGroup>
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>
              <Context
                usedTokens={usedTokens}
                maxTokens={selectedModel.maxTokens}
                modelId={selectedModel.id}
              >
                <ContextTrigger size="sm" className="text-xs" />
                <ContextContent>
                  <ContextContentHeader />
                  <ContextContentBody>
                    <ContextInputUsage />
                    <ContextOutputUsage />
                  </ContextContentBody>
                  <ContextContentFooter />
                </ContextContent>
              </Context>
            </PromptInputTools>
            <PromptInputSubmit
              disabled={!text.trim()}
              status={isStreaming ? "streaming" : "ready"}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
