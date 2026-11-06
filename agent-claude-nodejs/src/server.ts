import { app, routes } from "./app.ts";
import { checkAgentConfig, getAllowedModels } from "./utils.ts";
import { logger } from "./logger.ts";
import { getSessionStats, loadSessions } from "./sessions.ts";

const PORT = process.env.PORT ?? 4005;

loadSessions();

app.listen(PORT, () => {
  logger.info(`agent-claude-nodejs listening on http://localhost:${PORT}`);

  logger.info("");
  const { authMethod } = checkAgentConfig();
  if (authMethod === "api-key") {
    logger.info("Claude Agent SDK auth: using ANTHROPIC_API_KEY.");
  } else {
    logger.warn("⚠️ Claude Agent SDK auth: ANTHROPIC_API_KEY not set, using the Claude Code login (Claude subscription). If /query fails with an auth error, run `claude` and sign in with /login.");
  }

  logger.info(`ANTHROPIC_BASE_URL: ${process.env.ANTHROPIC_BASE_URL ?? "default (api.anthropic.com)"}`);

  const allowedModels = getAllowedModels();
  logger.info(`Allowed models (${allowedModels.length || "any"}): ${allowedModels.join(", ") || "any"}`);

  const { dir, total, empty, queries, lastActivity } = getSessionStats();
  logger.info(`Sessions (saved in ${dir}): ${total} total, ${empty} empty, ${queries} queries, last activity ${lastActivity ?? "n/a"}`);

  logger.info("");
  logger.info("Available endpoints:");
  let currentSection = "";
  for (const { section, method, path, description, params } of routes) {
    if (section !== currentSection) {
      currentSection = section;
      logger.info("");
      logger.info(`  ${section}`);
    }
    logger.info(`    ${method.padEnd(6)} ${path} - ${description}`);
    if (params.length === 0) {
      logger.info("           params: none");
    } else {
      for (const { name, in: paramIn, type, required, description: paramDescription } of params) {
        const location = paramIn === "body" ? "body, JSON" : paramIn;
        logger.info(`           - ${name} (${location}, ${type}, ${required ? "required" : "optional"}): ${paramDescription}`);
      }
    }
  }
});
