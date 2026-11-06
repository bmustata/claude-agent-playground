import "dotenv/config";
import { createSdkMcpServer, query } from "@anthropic-ai/claude-agent-sdk";
import { logger } from "../logger.ts";
import { tools } from "./tools/index.ts";

const TOOL_SERVER_NAME = "agent-tools";

const toolsServer = createSdkMcpServer({ name: TOOL_SERVER_NAME, tools });

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type RunAgentResult = {
  answer: string; // agent's final text reply to the prompt, e.g. "Paris is the capital of France."
  model: string | undefined; // model that answered, e.g. "claude-sonnet-5-5"
  rounds: number; // agent turns, e.g. 2
  toolsUsed: string[]; // tools called, e.g. ["currentTime"]
  usage: TokenUsage; // token counts, e.g. { inputTokens: 120, outputTokens: 45, ... }
  duration: number; // run time in ms, e.g. 1840
};

// Runs the Claude agent (optionally with a model override) against a prompt and returns its
// answer plus usage. Only our own tools are available: `tools: []` disables the built-in
// Claude Code tools (Bash, Read, Edit...), which don't belong in a stateless Q&A endpoint.
// `allowedTools` pre-approves our tools since there's no human to confirm interactively, and is
// safer than permissionMode "bypassPermissions", which would also skip checks for any built-in
// tool re-enabled later.
export async function runAgent(prompt: string, model?: string): Promise<RunAgentResult> {
  logger.info({ prompt, model }, `runAgent started${model ? ` using model "${model}"` : ""}`);
  const startTime = performance.now();

  const toolsUsed = new Set<string>();
  let actualModel: string | undefined;

  for await (const message of query({
    prompt,
    options: {
      model,
      tools: [],
      mcpServers: { [TOOL_SERVER_NAME]: toolsServer },
      allowedTools: [`mcp__${TOOL_SERVER_NAME}__currentTime`],
    },
  })) {
    // Only the main thread's own messages (parent_tool_use_id === null) reflect the model that
    // produced the final answer — a subagent call would carry a different parent id.
    if (message.type === "assistant" && message.parent_tool_use_id === null) {
      actualModel = message.message.model;
      for (const block of message.message.content) {
        // Custom MCP tools are exposed to the model as "mcp__<server>__<tool>" — strip that
        // prefix so toolsUsed reports the plain tool name (e.g. "currentTime").
        if (block.type === "tool_use") toolsUsed.add(block.name.replace(`mcp__${TOOL_SERVER_NAME}__`, ""));
      }
    }

    if (message.type === "result") {
      if (message.subtype !== "success") {
        logger.error({ message }, "runAgent failed");
        throw new Error(`Agent run failed: ${message.subtype}`);
      }

      const usage: TokenUsage = {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
      };

      const result: RunAgentResult = {
        answer: message.result,
        model: actualModel,
        rounds: message.num_turns,
        toolsUsed: [...toolsUsed],
        usage,
        duration: Math.round(performance.now() - startTime),
      };

      logger.info(
        { answerLength: result.answer.length, model: result.model, rounds: result.rounds, toolsUsed: result.toolsUsed, usage, duration: result.duration },
        "runAgent finished",
      );
      return result;
    }
  }

  throw new Error("Agent run ended without producing a result");
}
