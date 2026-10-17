// agent-browser driver shared by the browser scripts (harness.ts).
// Each script uses its own named session.

export interface Browser {
  /** Run an agent-browser command in this session; returns stdout. */
  run(...args: string[]): string;
  /** Evaluate JS in the page and return its result as a string (JSON for non-strings). */
  eval(js: string): string;
}

/** A non-null object, so its keys can be read. */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

/** Unwrap agent-browser's `--json` envelope (`{ success, data: { result } }`) to the eval result. */
function pick(v: unknown): unknown {
  if (isRecord(v)) {
    if (v["success"] === false) throw new Error(`eval failed: ${JSON.stringify(v["error"] ?? v)}`);
    if ("data" in v) return pick(v["data"]);
    if ("result" in v) return v["result"];
  }
  return v;
}

export function browser(session: string): Browser {
  const run = (...args: string[]): string => {
    const r = Bun.spawnSync(["agent-browser", "--session", session, ...args], { stdout: "pipe", stderr: "pipe" });
    if (r.exitCode !== 0) {
      throw new Error(`agent-browser ${args[0]} failed: ${r.stderr.toString()}${r.stdout.toString()}`);
    }
    return r.stdout.toString();
  };
  return {
    run,
    eval(js) {
      const out = run("--json", "eval", "-b", Buffer.from(js).toString("base64")).trim();
      const parsed: unknown = JSON.parse(out);
      const result = pick(parsed);
      return typeof result === "string" ? result : JSON.stringify(result);
    },
  };
}

export function decodeDataUrl(url: string): Buffer {
  const data = /^data:image\/png;base64,(.*)$/u.exec(url)?.[1];
  if (data === undefined || data === "") throw new Error(`not a PNG data URL: ${url.slice(0, 40)}...`);
  return Buffer.from(data, "base64");
}
