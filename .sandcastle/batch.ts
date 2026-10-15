import { $ } from "bun";
import { containers, logsFor, outcome, runIssue, usageReport, type IssueRun } from "./pipeline.ts";
import { createBatchTui } from "./tui.ts";

// Run with `bun run sandcastle:batch [issue-number ...] [--workers N] [--fresh]`.
// With no numbers it takes every open ready-for-agent issue, oldest first; an issue without that label is skipped.
//
// Each issue goes through the same pipeline as `bun run sandcastle` (pipeline.ts), up to N at a time.
// Bug issues (label `bug`) run one at a time, never alongside another bug: each is cut from a
// freshly fetched origin/main and, once its PR is green and CI passes, merged (squash) before the
// next bug starts, so every bug fix builds on the ones before it (ADR 0009). Other issues stop at
// an open PR for the owner, as usual.
//
// Ctrl-C stops every agent and removes the containers; a second Ctrl-C force-removes them and quits.
// Rerunning carries each issue on from where it stopped, as the single-issue runner does.
const READY = "ready-for-agent";
const BUG = "bug";
const CI_START_TRIES = 30;
const CI_START_WAIT_MS = 10_000;

const args = process.argv.slice(2);
const fresh = args.includes("--fresh");
const workersAt = args.indexOf("--workers");
const workers = workersAt === -1 ? 2 : Number(args[workersAt + 1]);
if (!Number.isInteger(workers) || workers < 1) throw new Error("--workers takes a whole number of at least 1.");
const named = args.filter((arg, i) => /^\d+$/u.test(arg) && i !== workersAt + 1);

interface Issue {
  number: number;
  labels: { name: string }[];
}
const fetched: unknown[] =
  named.length > 0
    ? await Promise.all(
        named.map(async (n): Promise<unknown> => {
          const view: unknown = await $`gh issue view ${n} --json number,labels`.quiet().json();
          return view;
        }),
      )
    : [
        await $`gh issue list --label ${READY} --state open --search sort:created-asc --limit 200 --json number,labels`
          .quiet()
          .json(),
      ].flat();
const listed = fetched.filter((value) => isIssue(value));
const has = (issue: Issue, label: string): boolean => issue.labels.some(({ name }) => name === label);
const skipped = listed.filter((issue) => !has(issue, READY)).map(({ number }) => `#${number}`);
const ready = listed.filter((issue) => has(issue, READY));
if (ready.length === 0)
  throw new Error(`No ${READY} issues to run${skipped.length > 0 ? ` (skipped ${skipped.join(", ")})` : ""}.`);

const bugs = ready.filter((issue) => has(issue, BUG)).map(({ number }) => String(number));
const others = ready.filter((issue) => !has(issue, BUG)).map(({ number }) => String(number));

const runs: IssueRun["runs"] = [];
const results = new Map<string, string>();
const tui = createBatchTui(`Sandcastle batch · ${workers} worker(s)`, [
  ...bugs.map((issue) => ({ issue, tag: BUG })),
  ...others.map((issue) => ({ issue, tag: "" })),
]);
if (skipped.length > 0) tui.activity(`Skipped, not ${READY}: ${skipped.join(", ")}`);

const stop = new AbortController();
const before = new Set(containers());
let interrupts = 0;
const interrupt = (): void => {
  interrupts++;
  if (interrupts === 1) {
    tui.activity("\u001B[33mStopping\u001B[0m: removing the containers. Ctrl-C again to force quit.");
    stop.abort(new Error("Interrupted"));
    return;
  }
  const ours = containers().filter((id) => !before.has(id));
  if (ours.length > 0) Bun.spawnSync(["docker", "rm", "-f", ...ours]);
  tui.close([`Force quit. Removed ${ours.length} container(s).`, ...report()]);
  process.exit(130);
};
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);

// Workers start their containers one at a time: creating git worktrees in the same repo at once
// can trip over git's lock files.
let setups: Promise<unknown> = Promise.resolve();
async function serialize<T>(work: () => Promise<T>): Promise<T> {
  const turn = setups.then(work);
  setups = turn.catch(() => null);
  const result = await turn;
  return result;
}

// Waits for the PR's CI to finish; true when every check passed.
async function ciPasses(url: string, attempt = 1): Promise<boolean> {
  if (stop.signal.aborted) return false;
  const watch = await $`gh pr checks ${url} --watch --fail-fast`.nothrow().quiet();
  if (watch.exitCode === 0) return true;
  // A PR opened a moment ago may have no checks yet; gh then says so and exits non-zero.
  const noChecks = `${watch.stdout.toString()}${watch.stderr.toString()}`.includes("no checks reported");
  if (!noChecks || attempt >= CI_START_TRIES) return false;
  await Bun.sleep(CI_START_WAIT_MS);
  return ciPasses(url, attempt + 1);
}

async function runOne(issue: string, bug: boolean): Promise<void> {
  const reporter = tui.reporter(issue);
  let current = "setup";
  try {
    // A bug builds on every bug merged before it, so it is cut from the latest origin/main.
    if (bug) await $`git fetch -q origin main`.quiet();
    const progress = await runIssue({
      issue,
      base: bug ? "origin/main" : "HEAD",
      fresh,
      reporter,
      signal: stop.signal,
      serialize,
      runs,
      onStep: (step) => {
        current = step;
      },
    });
    const { url = "" } = progress;
    if (!bug || progress.commented === true || progress.green !== true) {
      tui.set(issue, "done", "publish", outcome(progress));
      results.set(issue, `${outcome(progress)}: ${url}`);
      return;
    }
    current = "merge";
    tui.set(issue, "running", "merge", "waiting for CI");
    const merged = async (): Promise<boolean> =>
      (await $`gh pr view ${url} --json state --jq .state`.quiet().text()).trim() === "MERGED";
    if (!(await merged())) {
      // CI ran on this commit; the merge is refused if the branch has moved on since.
      const head = (await $`gh pr view ${url} --json headRefOid --jq .headRefOid`.quiet().text()).trim();
      if (!(await ciPasses(url))) {
        if (stop.signal.aborted) throw new Error("Interrupted");
        tui.set(issue, "failed", "merge", "CI red; PR left open");
        results.set(issue, `PR left open, CI red: ${url}`);
        return;
      }
      tui.set(issue, "running", "merge", "gh pr merge --squash");
      const merge = await $`gh pr merge ${url} --squash --delete-branch --match-head-commit ${head}`.nothrow().quiet();
      // gh can merge and then fail to delete the local branch (say, a kept worktree still has it),
      // so the PR's state decides, not the exit code.
      if (merge.exitCode !== 0 && !(await merged())) {
        tui.set(issue, "failed", "merge", "merge refused; PR left open");
        results.set(issue, `PR left open, merge refused (${merge.stderr.toString().trim()}): ${url}`);
        return;
      }
    }
    tui.set(issue, "done", "merge", "merged");
    results.set(issue, `Merged: ${url}`);
  } catch (error) {
    if (stop.signal.aborted) {
      tui.set(issue, "stopped", current, "stopped (Ctrl-C)");
      results.set(issue, `Stopped during ${current}`);
      return;
    }
    tui.set(issue, "failed", current, "failed");
    results.set(issue, `Failed during ${current}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Each worker takes the next bug if no bug is running, otherwise the next other issue. A worker
// with only a busy bug lane left stops; the worker holding the lane carries on through the bugs.
let bugRunning = false;
async function worker(): Promise<void> {
  if (stop.signal.aborted) return;
  const bug = bugRunning ? undefined : bugs.shift();
  if (bug !== undefined) {
    bugRunning = true;
    await runOne(bug, true);
    bugRunning = false;
    return worker();
  }
  const issue = others.shift();
  if (issue === undefined) return;
  await runOne(issue, false);
  return worker();
}

function isIssue(value: unknown): value is Issue {
  if (typeof value !== "object" || value === null || !("number" in value) || !("labels" in value)) return false;
  const { number, labels } = value;
  return (
    typeof number === "number" &&
    Array.isArray(labels) &&
    labels.every((label: unknown) => typeof label === "object" && label !== null && "name" in label)
  );
}

function report(): string[] {
  return [
    ...[...results].map(([issue, result]) => `#${issue}  ${result}  (logs: ${logsFor(issue)}/)`),
    ...(skipped.length > 0 ? [`Skipped, not ${READY}: ${skipped.join(", ")}`] : []),
  ];
}

await Promise.all(Array.from({ length: Math.min(workers, ready.length) }, worker));
tui.close([...report(), "", ...usageReport(runs)]);
if (stop.signal.aborted) process.exitCode = 130;
