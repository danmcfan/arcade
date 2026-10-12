// agent-browser driver shared by the browser scripts (harness.ts,
// capture-frames.ts). Each script uses its own named session.

export interface Browser {
  /** Run an agent-browser command in this session; returns stdout. */
  run(...args: string[]): string;
  /** Evaluate JS in the page and return its result as a string (JSON for non-strings). */
  eval(js: string): string;
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
      const pick = (v: unknown): unknown => {
        if (v !== null && typeof v === "object") {
          const o = v as Record<string, unknown>;
          if (o.success === false) throw new Error(`eval failed: ${JSON.stringify(o.error ?? o)}`);
          if ("data" in o) return pick(o.data);
          if ("result" in o) return o.result;
        }
        return v;
      };
      const result = pick(parsed);
      return typeof result === "string" ? result : JSON.stringify(result);
    },
  };
}

export function decodeDataUrl(url: string): Buffer {
  const m = /^data:image\/png;base64,(.*)$/.exec(url);
  if (!m?.[1]) throw new Error(`not a PNG data URL: ${url.slice(0, 40)}...`);
  return Buffer.from(m[1], "base64");
}
