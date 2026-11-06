// Reads and parses the ALLOWED_MODELS env var into a trimmed list of model names.
export function getAllowedModels(): string[] {
  return (process.env.ALLOWED_MODELS ?? "")
    .trim()
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

// Checks whether a given model name is in the allow-list (or allows any model if the list is empty).
export function isModelAllowed(model: string): boolean {
  const allowedModels = getAllowedModels();
  return allowedModels.length === 0 || allowedModels.includes(model);
}

// Reports how the Claude Agent SDK will authenticate: with ANTHROPIC_API_KEY when set, otherwise
// with the local Claude Code login (e.g. a Claude subscription), which can't be checked from here.
export function checkAgentConfig(): { authMethod: "api-key" | "claude-login" } {
  return { authMethod: process.env.ANTHROPIC_API_KEY ? "api-key" : "claude-login" };
}
