/**
 * Generates the OpenUI system prompt from the workflow component library.
 *
 * Run via `bun run generate:prompt` (wired into `dev` and `build`). The output
 * documents the WorkflowPanel/WorkflowStep/WorkflowInsight signatures and is
 * appended to the insights tool so the model speaks the same vocabulary.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { workflowLibrary } from "@/components/ai-elements/workflow-openui";

const prompt = workflowLibrary.prompt({
  preamble:
    "The following components describe the Hestia event-planning workflow panel.",
});

const out = resolve(process.cwd(), "lib/generated/workflow-system-prompt.txt");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, prompt, "utf8");

console.log(`Wrote workflow system prompt → ${out} (${prompt.length} chars)`);
