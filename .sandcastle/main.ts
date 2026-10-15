import { claudeCode, createSandbox, type SandboxRunResult } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { $ } from "bun";
import { createTui } from "./tui.ts";

// Run with `bun run sandcastle [issue-number]`. Needs Docker and .sandcastle/.env (copy .env.example).
// With no number it takes the lowest-numbered open ready-for-agent issue.
//
// One container, one branch (agent/<issue>, cut from the branch you have checked out):
//   implement (Opus) → review (Opus) → fix (Sonnet) → check, refixing up to 3 times → PR body (Sonnet)
// then this script pushes the branch and opens the PR. It is a draft if the check is still red.
// The terminal shows a progress view; each agent's full output goes to .sandcastle/logs/<issue>/.
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
const logs = `.sandcastle/logs/${issue}`;
const runs: { step: string; result: SandboxRunResult }[] = [];
const tui = createTui(`Sandcastle · issue #${issue} · ${branch}`, [
  "setup",
  "implement",
  "review",
  "fix",
  "check",
  "pr",
  "publish",
]);
let current = "setup";

try {
  tui.start("setup", "container and bun install");
  await using sandbox = await createSandbox({
    branch,
    sandbox: docker(),
    hooks: { sandbox: { onSandboxReady: [{ command: "bun install --frozen-lockfile" }] } },
  });
  tui.done("setup");

  // One agent session, shown under the TUI step `tuiStep`; `name` also names its log file.
  const step = async (
    tuiStep: string,
    name: string,
    agent: typeof OPUS,
    promptFile: string,
    args: Record<string, string> = {},
  ): Promise<void> => {
    current = tuiStep;
    const result = await sandbox.run({
      name,
      agent,
      promptFile: `./.sandcastle/${promptFile}`,
      promptArgs: { ISSUE_NUMBER: issue, ...args },
      logging: { type: "file", path: `${logs}/${name}.log`, onAgentStreamEvent: tui.event },
    });
    for (const { usage } of result.iterations) tui.tokens(tuiStep, usage);
    tui.activity(`${name}: ${result.commits.length} commit(s)`);
    runs.push({ step: name, result });
  };

  tui.start("implement", "Opus");
  await step("implement", "implement", OPUS, "implement.md");
  tui.done("implement");

  tui.start("review", "Opus");
  await step("review", "review", OPUS, "review.md");
  tui.done("review");

  tui.start("fix", "Sonnet");
  await step("fix", "fix", SONNET, "fix.md", {
    TASK: "The review findings are in `out/pipeline/review.md`. If it says `No findings.`, write that to `out/pipeline/fixes.md` and stop.",
  });
  tui.done("fix");

  // The fix agent is told to leave the check green; this makes sure, and refixes if not.
  const checkGreen = async (round: number): Promise<boolean> => {
    current = "check";
    tui.start("check", round === 1 ? "bun run check" : `bun run check, after fix round ${round - 1}`);
    const check = await sandbox.exec("bun run check");
    if (check.exitCode === 0) return true;
    tui.activity(`\u001B[31mbun run check failed\u001B[0m (round ${round})`);
    if (round > MAX_FIX_ROUNDS) return false;
    // A file, not a prompt arg: prompt args are pasted in before !`...` blocks run.
    await Bun.write(`${sandbox.worktreePath}/out/pipeline/check.log`, `${check.stdout}\n${check.stderr}`);
    tui.start("check", `fixing, round ${round} of ${MAX_FIX_ROUNDS} (Sonnet)`);
    await step("check", `fix-check-${round}`, SONNET, "fix.md", {
      TASK: "`bun run check` fails; its output is in `out/pipeline/check.log`. Make it pass by fixing the code, never the rules. Each failure is one item; use its tool and file as the id.",
    });
    return checkGreen(round + 1);
  };
  const green = await checkGreen(1);
  if (green) tui.done("check", "green");
  else tui.fail("check", `red after ${MAX_FIX_ROUNDS} fix rounds; PR will be a draft`);

  tui.start("pr", "Sonnet");
  await step("pr", "pr", SONNET, "pr.md", { CHECK: green ? "passing" : "FAILING" });
  tui.done("pr");

  current = "publish";
  tui.start("publish", "push and gh pr create");
  const pipeline = `${sandbox.worktreePath}/out/pipeline`;
  const pr: unknown = await Bun.file(`${pipeline}/pr.json`).json();
  if (!isPrSpec(pr)) throw new Error(`${pipeline}/pr.json is not {"title": string, "attach": string[]}`);
  const attachments = pr.attach.flatMap((path) => ["--attach", path]);
  await $`git push -q -u origin ${branch}`.quiet();
  const draft = green ? [] : ["--draft"];
  const url = (
    await $`gh pr create --head ${branch} --title ${pr.title} --body-file ${pipeline}/pr-body.md ${draft} ${attachments}`
      .cwd(sandbox.worktreePath)
      .quiet()
      .text()
  ).trim();
  tui.done("publish", url);

  tui.close([`${green ? "PR" : "Draft PR (check failing)"}: ${url}`, `Logs: ${logs}/`, "", ...usageReport()]);
} catch (error) {
  tui.fail(current, "failed");
  tui.close([`Failed during ${current}. Logs: ${logs}/`, "", ...usageReport()]);
  throw error;
}

function usageReport(): string[] {
  return runs.flatMap(({ step: name, result }) =>
    result.iterations.map(({ sessionId, usage }) => {
      const tokens = usage
        ? `in ${usage.inputTokens}, out ${usage.outputTokens}, cache write ${usage.cacheCreationInputTokens}, cache read ${usage.cacheReadInputTokens}`
        : "no usage reported";
      return `${name} (${sessionId ?? "no id"}): ${tokens}`;
    }),
  );
}

function isPrSpec(value: unknown): value is { title: string; attach: string[] } {
  if (typeof value !== "object" || value === null) return false;
  if (!("title" in value) || !("attach" in value)) return false;
  const { title, attach } = value;
  return (
    typeof title === "string" && Array.isArray(attach) && attach.every((path: unknown) => typeof path === "string")
  );
}
