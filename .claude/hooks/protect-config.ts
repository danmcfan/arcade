// PreToolUse hook: agents may not edit the files that define the quality gate.
// Loosening a rule is the owner's call, made by hand in a reviewed PR
// (.github/CODEOWNERS lists the same files).

import { relative } from "node:path";

const guarded = [
  /^tsconfig\.json$/u,
  /^\.oxlintrc\.json$/u,
  /^\.prettier(?:rc\.json|ignore)$/u,
  /^knip\.json$/u,
  /^package\.json$/u,
  /^scripts\/lint-guards\.ts$/u,
  /^\.githooks\//u,
  /^\.github\//u,
  /^\.claude\/(?:settings\.json|hooks\/)/u,
];

interface HookInput {
  tool_input?: { file_path?: unknown; notebook_path?: unknown };
}

function isHookInput(v: unknown): v is HookInput {
  return typeof v === "object" && v !== null;
}

const raw: unknown = JSON.parse(await Bun.stdin.text());
const input = isHookInput(raw) ? raw.tool_input : undefined;
const target = input?.file_path ?? input?.notebook_path;
if (typeof target === "string") {
  const path = relative(process.cwd(), target);
  if (guarded.some((re) => re.test(path))) {
    process.stderr.write(
      `${path} is part of the quality gate and is protected. Fix the code instead of the rules; ` +
        "if the rule itself is wrong, ask the owner to change it.\n",
    );
    process.exit(2);
  }
}
