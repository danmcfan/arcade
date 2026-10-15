import { claudeCode, run } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { $ } from "bun";

// Run with `bun run sandcastle [issue-number]`. Needs Docker and .sandcastle/.env (copy .env.example).
// With no number it takes the lowest-numbered open ready-for-agent issue. The agent commits to
// its own branch, agent/<issue>, cut from the branch you have checked out.
const issue =
  process.argv[2] ??
  (
    await $`gh issue list --label ready-for-agent --state open --json number --jq 'map(.number) | min // empty'`.text()
  ).trim();
if (issue === "") throw new Error("No open ready-for-agent issue; pass an issue number.");

const result = await run({
  name: `issue-${issue}`,
  agent: claudeCode("claude-opus-5-5"),
  sandbox: docker(),
  branchStrategy: { type: "branch", branch: `agent/${issue}` },
  promptFile: "./.sandcastle/prompt.md",
  promptArgs: { ISSUE_NUMBER: issue },
  hooks: { sandbox: { onSandboxReady: [{ command: "bun install --frozen-lockfile" }] } },
  logging: { type: "stdout" },
});

process.stdout.write(`\nBranch ${result.branch}: ${result.commits.length} commit(s)\n`);
for (const [i, { sessionId, usage }] of result.iterations.entries()) {
  const tokens = usage
    ? `in ${usage.inputTokens}, out ${usage.outputTokens}, cache write ${usage.cacheCreationInputTokens}, cache read ${usage.cacheReadInputTokens}`
    : "no usage reported";
  process.stdout.write(`Session ${i + 1} (${sessionId ?? "no id"}): ${tokens}\n`);
}
