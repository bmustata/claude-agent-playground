import "dotenv/config";
import { query, type AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { logger } from "../logger.ts";
import { getSession, markSessionUsed } from "../sessions.ts";
import type { RunAgentResult } from "./mini-agent.ts";

// ---
// Sample prompt: "Use the data-analyst agent to mandalorian-universe.csv: row count, column names, and the top 3 titles by budget."
// ---
// Sub-agents the main agent can delegate to via the Task tool. The description tells the main
// agent when to pick each one; the prompt is the sub-agent's own system prompt.
export const SUBAGENTS: Record<string, AgentDefinition> = {
  "data-analyst": {
    description: "Analyzes CSV files and reports simple statistics. Use for any data question.",
    prompt:
      "You are a data analyst. Read the file, compute the numbers, and reply in Markdown. " +
      "Present results as Markdown tables (header row, separator row, one row per item) whenever the data fits " +
      "a table, and add at most one short sentence of context. Use plain text only if a table doesn't fit.",
    tools: ["Read", "Bash"],
    model: "sonnet",
    background: false, // run in the foreground so the main agent waits for the table
  },
};

export type RunSubagentsResult = RunAgentResult & {
  steps: string[]; // intermediate steps in order, e.g. ["Started data-analyst: ...", "data-analyst: using Read"]
};

// Same as runMiniAgent, but the agent can spawn the sub-agents in SUBAGENTS through the Task tool.
// When a sessionId is given it runs inside that session (like runMiniAgentSession), so the
// conversation context is kept and a successful run is recorded on the session. Throws if the
// session doesn't exist.
export async function runMiniAgentSubagents(
  prompt: string,
  model?: string,
  sessionId?: string,
): Promise<RunSubagentsResult> {
  const session = sessionId ? getSession(sessionId) : undefined;
  if (sessionId && !session) throw new Error(`Session not found: ${sessionId}`);

  logger.info({ prompt, model, sessionId }, "runMiniAgentSubagents started");
  const startTime = performance.now();
  const steps: string[] = [];
  const addStep = (step: string) => {
    steps.push(step);
    logger.info({ sessionId, step }, "runMiniAgentSubagents step");
  };

  for await (const message of query({
    prompt,
    options: {
      model,
      // "Task" lets the main agent call a sub-agent; Read and Bash are for the sub-agents (they need
      // approval too, there is nobody to ask).
      allowedTools: ["Task", "Read", "Bash"],
      // Without this the Task tool may background the sub-agent and the run ends with "it is running
      // in the background" instead of its findings.
      env: { ...process.env, CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1" },
      agents: SUBAGENTS,
      ...(session ? (session.queryCount > 0 ? { resume: session.id } : { sessionId: session.id }) : {}),
    },
  })) {
    // Handle system messages related to sub-agent tasks.
    if (message.type === "system" && message.subtype === "task_started") {
      addStep(`Started ${message.subagent_type ?? "sub-agent"}: ${message.description}`);
    } else if (message.type === "system" && message.subtype === "task_progress" && message.last_tool_name) {
      addStep(`${message.subagent_type ?? "sub-agent"}: using ${message.last_tool_name}`);
    } else if (message.type === "system" && message.subtype === "task_notification") {
      addStep(`Sub-agent ${message.status}: ${message.summary}`);
    }

    // Check for failure messages from sub-agents and throw an error if encountered.
    if (message.type === "result" && message.subtype !== "success") {
      logger.error({ message }, "runMiniAgentSubagents failed");
      throw new Error(`Agent run failed: ${message.subtype}`);
    }

    // If we receive a result message, construct the final result object and return it.
    if (message.type === "result") {
      const result: RunSubagentsResult = {
        answer: message.result,
        rounds: message.num_turns,
        duration: Math.round(performance.now() - startTime),
        steps,
      };

      if (session) markSessionUsed(session.id, prompt, result.answer);

      logger.info(
        { sessionId, answerLength: result.answer.length, rounds: result.rounds, duration: result.duration },
        "runMiniAgentSubagents finished",
      );
      return result;
    }
  }

  throw new Error("Agent run ended without producing a result");
}
