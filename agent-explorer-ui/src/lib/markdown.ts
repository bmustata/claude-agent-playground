const GFM_INSTRUCTION = 'Return the final answer as GitHub-Flavored Markdown (GFM).'
const GFM_SUFFIX = `\n\n${GFM_INSTRUCTION}`

// Asks the agent to answer in GitHub-Flavored Markdown by appending an instruction to the prompt.
export function withGfmInstruction(prompt: string): string {
  return `${prompt}${GFM_SUFFIX}`
}

// Removes the instruction added by withGfmInstruction, so stored prompts display as the user typed them.
export function stripGfmInstruction(prompt: string): string {
  return prompt.endsWith(GFM_SUFFIX) ? prompt.slice(0, -GFM_SUFFIX.length) : prompt
}
