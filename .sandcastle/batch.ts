import { $ } from "bun";
import {
  containers,
  logsFor,
  outcome,
  resolveConflicts,
  runIssue,
  usageReport,
  type IssueRun,
  type Reporter,
} from "./pipeline.ts";
import { createBatchTui } from "./tui.ts";

// Run with `bun run sandcastle:batch [issue-number ...] [--workers N] [--fresh]`.
// With no numbers it takes every open ready-for-agent issue, oldest first; an issue without that label is skipped.
//
// Each issue goes through the same pipeline as `bun run sandcastle` (pipeline.ts), up to N at a time.
// Bug issues (label `bug`) run one at a time, never alongside another bug: each is cut from a
// freshly fetched origin/main and, once its PR is green and CI passes, merged (squash) before the
// next bug starts, so every bug fix builds on the ones before it (ADR 0009). If main moves on and
// the PR comes to conflict with it, an agent merges main in (sync.md) and CI runs again. Other issues stop at
// an open PR for the owner, as usual.
//
// Ctrl-C stops every agent and removes the containers; a second Ctrl-C force-removes them and quits.
// Rerunning carries each issue on from where it stopped, as the single-issue runner does.
const READY = "ready-for-agent";
const BUG = "bug";
const CI_POLL_MS = 30_000;
// No check at all after this long means CI is not coming.
const CI_START_MS = 5 * 60_000;
// A run that takes longer than this is stuck.
const CI_TIMEOUT_MS = 45 * 60_000;
// Times a bug's PR may have main merged in to clear conflicts before it is left for the owner.
const MAX_SYNCS = 2;

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

type CiResult = "passed" | "failed" | "conflicting" | "never started" | "timed out";

// Polls the PR until its CI finishes on the head commit. Every poll also reads whether the PR
// conflicts with main, because GitHub runs no CI on a conflicting PR: it would wait forever.
async function waitForCi(url: string, started = Date.now()): Promise<CiResult> {
  if (stop.signal.aborted) return "failed";
  const view: unknown = await $`gh pr view ${url} --json mergeable,statusCheckRollup`.quiet().json();
  const { mergeable, checks } = prChecks(view);
  if (mergeable === "CONFLICTING") return "conflicting";
  const waited = Date.now() - started;
  if (checks.includes("failed")) return "failed";
  if (checks.length > 0 && checks.every((check) => check === "passed")) return "passed";
  // A PR opened a moment ago may have no checks yet, and GitHub may still be working out mergeable.
  if (checks.length === 0 && waited > CI_START_MS) return "never started";
  if (waited > CI_TIMEOUT_MS) return "timed out";
  await Bun.sleep(CI_POLL_MS);
  return waitForCi(url, started);
}

// mergeable is MERGEABLE, CONFLICTING or UNKNOWN; each check run or commit status is pending, passed or failed.
function prChecks(view: unknown): { mergeable: string; checks: ("pending" | "passed" | "failed")[] } {
  if (typeof view !== "object" || view === null) return { mergeable: "UNKNOWN", checks: [] };
  const mergeable = "mergeable" in view && typeof view.mergeable === "string" ? view.mergeable : "UNKNOWN";
  const rollup = "statusCheckRollup" in view && Array.isArray(view.statusCheckRollup) ? view.statusCheckRollup : [];
  const checks = rollup.map((check: unknown) => {
    const field = (key: string): string => {
      const value: unknown = typeof check === "object" && check !== null ? Reflect.get(check, key) : undefined;
      return typeof value === "string" ? value : "";
    };
    // A check run has status and conclusion; a commit status has state.
    const state = field("state");
    if (state !== "")
      return state === "SUCCESS" ? "passed" : state === "PENDING" || state === "EXPECTED" ? "pending" : "failed";
    if (field("status") !== "COMPLETED") return "pending";
    return ["SUCCESS", "SKIPPED", "NEUTRAL"].includes(field("conclusion")) ? "passed" : "failed";
  });
  return { mergeable, checks };
}

// Whether the issue's pushed branch conflicts with the latest main, by a trial merge in git.
async function conflictsWithMain(issue: string): Promise<boolean> {
  await $`git fetch -q origin main agent/${issue}`.quiet();
  const trial = await $`git merge-tree --write-tree origin/main origin/agent/${issue}`.nothrow().quiet();
  // 1 is a conflict; anything else non-zero is git failing, which must not pass for one.
  if (trial.exitCode > 1) throw new Error(`git merge-tree failed: ${trial.stderr.toString().trim()}`);
  return trial.exitCode === 1;
}

// Merges a bug's green PR once CI passes; null when merged, otherwise why it was left open.
// Main can move on while a bug runs (the owner merges something), so the PR can come to conflict
// with it; then an agent merges main in, and CI runs again, up to MAX_SYNCS times.
async function land(issue: string, url: string, reporter: Reporter, syncs = 0): Promise<string | null> {
  const state = async (field: string): Promise<string> =>
    (await $`gh pr view ${url} --json ${field} --jq .${field}`.quiet().text()).trim();
  if ((await state("state")) === "MERGED") return null;
  // CI runs on this commit; the merge is refused if the branch has moved on since.
  const head = await state("headRefOid");
  // GitHub works out mergeable lazily and can say UNKNOWN for a long time, so git decides too:
  // before waiting, and again if CI never starts or never finishes.
  const early = await conflictsWithMain(issue);
  tui.set(issue, "running", "merge", syncs === 0 ? "waiting for CI" : `waiting for CI, after merging main (${syncs})`);
  const ci = early ? "conflicting" : await waitForCi(url);
  if (stop.signal.aborted) throw new Error("Interrupted");
  const stalled = ci === "never started" || ci === "timed out";
  if (ci === "conflicting" || (stalled && (await conflictsWithMain(issue)))) {
    if (syncs >= MAX_SYNCS) return `still conflicts with main after ${MAX_SYNCS} merge(s)`;
    tui.set(issue, "running", "merge", "conflicts with main: merging it in (Opus)");
    await resolveConflicts({ issue, reporter, signal: stop.signal, serialize, runs });
    return land(issue, url, reporter, syncs + 1);
  }
  if (ci !== "passed") return `CI ${ci}`;
  tui.set(issue, "running", "merge", "gh pr merge --squash");
  const merge = await $`gh pr merge ${url} --squash --delete-branch --match-head-commit ${head}`.nothrow().quiet();
  // gh can merge and then fail to delete the local branch (say, a kept worktree still has it),
  // so the PR's state decides, not the exit code. A merge refused because main moved during CI
  // goes round again, and the next poll finds the conflict.
  if (merge.exitCode === 0 || (await state("state")) === "MERGED") return null;
  if ((await state("mergeable")) === "CONFLICTING") return land(issue, url, reporter, syncs);
  return `merge refused (${merge.stderr.toString().trim()})`;
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
    const left = await land(issue, url, reporter);
    if (left === null) {
      tui.set(issue, "done", "merge", "merged");
      results.set(issue, `Merged: ${url}`);
    } else {
      tui.set(issue, "failed", "merge", `${left}; PR left open`);
      results.set(issue, `PR left open, ${left}: ${url}`);
    }
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
