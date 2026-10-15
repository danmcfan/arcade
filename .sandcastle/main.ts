import { claudeCode, run } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

// Run with `bun run sandcastle`. Needs Docker and .sandcastle/.env (copy .env.example).
await run({
  agent: claudeCode("claude-opus-5-5"),
  sandbox: docker(),
  promptFile: "./.sandcastle/prompt.md",
});
