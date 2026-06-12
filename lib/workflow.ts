/**
 * Workflow model for Hestia event planning.
 *
 * A workflow is a reproducible directed acyclic graph (DAG) of steps the AI runs
 * while planning an event. It is NOT hand-authored by the user — it is derived
 * reactively from the chat: as the assistant gathers details and runs the
 * `create_event_plan` tool, steps light up so the whole path is traceable and
 * observable (no chatbot scrolling required).
 *
 * Steps are not purely sequential. Each step declares the steps it `dependsOn`,
 * so independent steps that share the same dependencies run in parallel (e.g.
 * the Luma page, catering, and vendor subagents all fan out from
 * "Gather Event Details" and fan back into "Compile Event Plan").
 */

export type StepStatus = "pending" | "running" | "succeeded" | "failed";

export type StepCategory = "trigger" | "agent" | "ai" | "research";

export interface StepIO {
    label: string;
    /** Short value shown as a badge/preview in the observability panel. */
    preview?: string;
    /** Full value revealed when the field is expanded. */
    value?: string;
}

export interface WorkflowStep {
    id: string;
    title: string;
    /** Lucide icon name used by the node + observability panel. */
    icon: string;
    category: StepCategory;
    status: StepStatus;
    /** What the node consumes. */
    inputs: StepIO[];
    /** What the node produces — surfaced as the node's output badge. */
    outputs: StepIO[];
    /**
     * IDs of steps that must finish before this one starts. An empty array marks
     * a root. Steps that share the same dependencies run in parallel; a step
     * with multiple dependencies is a fan-in (join) of parallel branches.
     */
    dependsOn: string[];
}

/** The shape of the `create_event_plan` tool surfaced in the chat stream. */
export type PlanToolState =
    | "input-streaming"
    | "input-available"
    | "output-available";

export interface PlanToolInput {
    title?: string;
    description?: string;
    headcount?: number;
    area?: string;
    date?: string;
    food?: string;
    lumaPage?: boolean;
    steps?: { title: string; description: string }[];
}

export interface PlanToolOutput {
    airbyteContext?: {
        background?: { ok?: boolean; records?: unknown[] };
    };
    lumaEvent?: {
        url: string;
        title: string;
        area: string;
        date: string;
        headcount: number;
    } | null;
    catering?: { provider: string }[];
    vendors?: { vendors: { name: string; category: string }[] };
}

export interface DeriveWorkflowArgs {
    /** True once the conversation has begun (≥1 message). */
    started: boolean;
    /** Present once the `create_event_plan` tool appears in the stream. */
    toolState?: PlanToolState;
    input?: PlanToolInput;
    output?: PlanToolOutput;
}

const WORKFLOW_NAME = "Event Planning Pipeline";

function specPreview(input?: PlanToolInput): string | undefined {
    if (!input) return undefined;
    const parts: string[] = [];
    if (input.headcount) parts.push(`${input.headcount} guests`);
    if (input.area) parts.push(input.area);
    if (input.date) parts.push(input.date);
    return parts.length ? parts.join(" · ") : undefined;
}

function specValue(input?: PlanToolInput): string | undefined {
    if (!input) return undefined;
    const lines: string[] = [];
    if (input.headcount) lines.push(`Headcount: ${input.headcount}`);
    if (input.area) lines.push(`Area: ${input.area}`);
    if (input.date) lines.push(`Date: ${input.date}`);
    if (input.food) lines.push(`Food: ${input.food}`);
    if (input.lumaPage !== undefined) {
        lines.push(`Luma page: ${input.lumaPage ? "yes" : "no"}`);
    }
    return lines.length ? lines.join("\n") : undefined;
}

/**
 * Derive the live workflow graph from the current chat / tool state. Called on
 * every render so the canvas stays in lockstep with the assistant.
 */
export function deriveWorkflow({
    started,
    toolState,
    input,
    output,
}: DeriveWorkflowArgs): { name: string; steps: WorkflowStep[] } {
    const toolFired = toolState !== undefined;
    const dispatching = toolState === "input-available";
    const done = toolState === "output-available";

    const spec = specPreview(input);
    const specFull = specValue(input);

    // Subagent statuses: pending until the tool dispatches, running while the
    // tool is dispatched, then succeeded once their output is present.
    const subStatus = (hasOutput: boolean): StepStatus => {
        if (hasOutput) return "succeeded";
        if (dispatching) return "running";
        if (done) return "succeeded";
        return "pending";
    };

    const airbyteRecordCount = output?.airbyteContext?.background?.records?.length ?? 0;
    const airbyteOk = output?.airbyteContext?.background?.ok;
    const airbyteContextDone = airbyteOk !== undefined;

    const lumaDone = Boolean(output?.lumaEvent);
    const cateringDone = Boolean(output?.catering?.length);
    const vendorsDone = Boolean(output?.vendors?.vendors?.length);

    const gatherStatus: StepStatus = toolFired
        ? "succeeded"
        : started
            ? "running"
            : "pending";

    const steps: WorkflowStep[] = [
        {
            id: "start",
            title: "Start",
            icon: "Sparkles",
            category: "trigger",
            status: started ? "succeeded" : "pending",
            inputs: [{ label: "User Request" }],
            outputs: [{ label: "User Request" }],
            dependsOn: [],
        },
        {
            id: "gather-details",
            title: "Gather Event Details",
            icon: "ClipboardList",
            category: "ai",
            status: gatherStatus,
            inputs: [{ label: "User Request" }],
            outputs: [
                {
                    label: "Event Spec",
                    preview: spec ?? (toolFired ? "Captured" : "Collecting…"),
                    value: specFull,
                },
            ],
            dependsOn: ["start"],
        },
        {
            id: "airbyte-context",
            title: "Fetch Event Context",
            icon: "DatabaseZap",
            category: "research",
            status: airbyteContextDone
                ? "succeeded"
                : dispatching
                    ? "running"
                    : "pending",
            inputs: [{ label: "Event Spec", preview: spec }],
            outputs: [
                {
                    label: "Context Records",
                    preview: airbyteContextDone
                        ? airbyteOk
                            ? airbyteRecordCount > 0
                                ? `${airbyteRecordCount} records`
                                : "No records"
                            : "Unavailable"
                        : "—",
                    value: airbyteContextDone
                        ? airbyteOk
                            ? `Airbyte Context Store returned ${airbyteRecordCount} background record${airbyteRecordCount !== 1 ? "s" : ""}`
                            : "Airbyte Context Store not configured — agents will use Exa only"
                        : undefined,
                },
            ],
            dependsOn: ["gather-details"],
        },
        {
            id: "luma-page",
            title: "Create Luma Event Page",
            icon: "CalendarPlus",
            category: "agent",
            status: subStatus(lumaDone),
            inputs: [{ label: "Event Spec", preview: spec }],
            outputs: [
                {
                    label: "Event Page URL",
                    preview: output?.lumaEvent?.url ?? (lumaDone ? "Created" : "—"),
                    value: output?.lumaEvent?.url,
                },
            ],
            dependsOn: ["airbyte-context"],
        },
        {
            id: "catering",
            title: "Source Catering",
            icon: "UtensilsCrossed",
            category: "research",
            status: subStatus(cateringDone),
            inputs: [
                { label: "Event Spec", preview: input?.food },
                {
                    label: "Context Records",
                    preview: airbyteContextDone
                        ? airbyteRecordCount > 0
                            ? `${airbyteRecordCount} records`
                            : "None"
                        : "—",
                },
            ],
            outputs: [
                {
                    label: "Catering Options",
                    preview: cateringDone ? `${output?.catering?.length} options` : "—",
                    value: output?.catering?.map((c) => `• ${c.provider}`).join("\n"),
                },
            ],
            dependsOn: ["airbyte-context"],
        },
        {
            id: "vendors",
            title: "Find Vendors",
            icon: "Store",
            category: "research",
            status: subStatus(vendorsDone),
            inputs: [
                { label: "Event Spec", preview: "Venue · AV · Photo · Florals" },
                {
                    label: "Context Records",
                    preview: airbyteContextDone
                        ? airbyteRecordCount > 0
                            ? `${airbyteRecordCount} records`
                            : "None"
                        : "—",
                },
            ],
            outputs: [
                {
                    label: "Vendor Shortlist",
                    preview: vendorsDone
                        ? `${output?.vendors?.vendors.length} vendors`
                        : "—",
                    value: output?.vendors?.vendors
                        .map((v) => `• ${v.category}: ${v.name}`)
                        .join("\n"),
                },
            ],
            dependsOn: ["airbyte-context"],
        },
        {
            id: "compile-plan",
            title: "Compile Event Plan",
            icon: "FileCheck2",
            category: "ai",
            status: done ? "succeeded" : dispatching ? "running" : "pending",
            inputs: [
                { label: "Event Page URL" },
                { label: "Catering Options" },
                { label: "Vendor Shortlist" },
            ],
            outputs: [{ label: "Final Plan", preview: done ? "Ready" : "—" }],
            dependsOn: ["luma-page", "catering", "vendors"],
        },
    ];

    return { name: WORKFLOW_NAME, steps };
}
