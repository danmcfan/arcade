import { claudeCode, createSandbox, type SandboxRunResult } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { $ } from "bun";

// Run with `bun run sandcastle [issue-number]`. Needs Docker and .sandcastle/.env (copy .env.example).
// With no number it takes the lowest-numbered open ready-for-agent issue.
//
// One container, one branch (agent/<issue>, cut from the branch you have checked out):
//   implement (Opus) → review (Opus) → fix (Sonnet) → check, refixing up to 3 times → PR body (Sonnet)
// then this script pushes the branch and opens the PR. It is a draft if the check is still red.
const MAX_FIX_ROUNDS = 3;
const OPUS = claudeCode("claude-opus-5-5", { effort: "low" });
const SONNET = claudeCode("claude-sonnet-5-5", { effort: "low" });

const issue =
  process.argv[2] ??
  (
    await $`gh issue list --label ready-for-agent --state open --json number --jq 'map(.number) | min // empty'`.text()
  ).trim();
if (issue === "") throw new Error("No open ready-for-agent issue; pass an issue number.");

const branch = `agent/${issue}`;
const runs: { step: string; result: SandboxRunResult }[] = [];

await using sandbox = await createSandbox({
  branch,
  sandbox: docker(),
  hooks: { sandbox: { onSandboxReady: [{ command: "bun install --frozen-lockfile" }] } },
});

async function step(
  name: string,
  agent: typeof OPUS,
  promptFile: string,
  args: Record<string, string> = {},
): Promise<void> {
  const result = await sandbox.run({
    name,
    agent,
    promptFile: `./.sandcastle/${promptFile}`,
    promptArgs: { ISSUE_NUMBER: issue, ...args },
    logging: { type: "stdout" },
  });
  runs.push({ step: name, result });
}

await step("implement", OPUS, "implement.md");
await step("review", OPUS, "review.md");
await step("fix", SONNET, "fix.md", {
  TASK: "The review findings are in `out/pipeline/review.md`. If it says `No findings.`, write that to `out/pipeline/fixes.md` and stop.",
});

// The fix agent is told to leave the check green; this makes sure, and refixes if not.
async function checkGreen(round: number): Promise<boolean> {
  const check = await sandbox.exec("bun run check");
  if (check.exitCode === 0) return true;
  if (round > MAX_FIX_ROUNDS) return false;
  // A file, not a prompt arg: prompt args are pasted in before !`...` blocks run.
  await Bun.write(`${sandbox.worktreePath}/out/pipeline/check.log`, `${check.stdout}\n${check.stderr}`);
  await step(`fix check ${round}`, SONNET, "fix.md", {
    TASK: "`bun run check` fails; its output is in `out/pipeline/check.log`. Make it pass by fixing the code, never the rules. Each failure is one item; use its tool and file as the id.",
  });
  return checkGreen(round + 1);
}
const green = await checkGreen(1);

await step("pr", SONNET, "pr.md", { CHECK: green ? "passing" : "FAILING" });

const pipeline = `${sandbox.worktreePath}/out/pipeline`;
const pr: unknown = await Bun.file(`${pipeline}/pr.json`).json();
if (!isPrSpec(pr)) throw new Error(`${pipeline}/pr.json is not {"title": string, "attach": string[]}`);
const attachments = pr.attach.flatMap((path) => ["--attach", path]);
await $`git push -u origin ${branch}`;
const draft = green ? [] : ["--draft"];
const url =
  await $`gh pr create --head ${branch} --title ${pr.title} --body-file ${pipeline}/pr-body.md ${draft} ${attachments}`
    .cwd(sandbox.worktreePath)
    .text();

process.stdout.write(`\n${green ? "PR" : "Draft PR (check failing)"}: ${url.trim()}\n`);
for (const { step: name, result } of runs) {
  for (const { sessionId, usage } of result.iterations) {
    const tokens = usage
      ? `in ${usage.inputTokens}, out ${usage.outputTokens}, cache write ${usage.cacheCreationInputTokens}, cache read ${usage.cacheReadInputTokens}`
      : "no usage reported";
    process.stdout.write(`${name} (${sessionId ?? "no id"}): ${tokens}\n`);
  }
}

function isPrSpec(value: unknown): value is { title: string; attach: string[] } {
  if (typeof value !== "object" || value === null) return false;
  if (!("title" in value) || !("attach" in value)) return false;
  const { title, attach } = value;
  return (
    typeof title === "string" && Array.isArray(attach) && attach.every((path: unknown) => typeof path === "string")
  );
}
