import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

export const currentTimeTool = tool(
  "currentTime",
  "Returns the current time along with the day of the month and month (e.g. '2:48 PM, September 21'). Optionally pass an IANA time zone (e.g. 'Europe/Bucharest') for the local time there; defaults to UTC.",
  {
    timeZone: z.string().optional().describe("IANA time zone name, e.g. 'Europe/Bucharest'."),
  },
  async ({ timeZone }) => {
    const now = new Date();
    const text = now.toLocaleString("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "long",
    });
    return { content: [{ type: "text", text }] };
  },
);
