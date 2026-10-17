import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

// Arcade's own gate rules (issue #265): a run whose evidence would mislead the owner opens no PR.
// Sandworm hands each rule the run's worktree and changed files; the checks themselves are pure.

// Structural copies of sandworm's GateFailure and GateRule: importing its types drags in
// sandcastle's declarations, which need @standard-schema/spec and fail the strict typecheck.
interface GateFailure {
  rule: string;
  message: string;
}
type GateRule = (run: {
  worktree: string;
  changed: string[];
  evidenceDir: string;
  evidence: string[];
}) => GateFailure[] | Promise<GateFailure[]>;

/** The notice's background (src/ui/notice.ts): the page around it is black. */
const NOTICE_BACKGROUND = [0x1a, 0x1c, 0x2c] as const;
/** The share of the reference's pixels a screenshot must match to be the notice. */
const MATCH = 0.95;

const rgb = (png: PNG, x: number, y: number): [number, number, number] => {
  const i = (y * png.width + x) * 4;
  return [png.data[i] ?? 0, png.data[i + 1] ?? 0, png.data[i + 2] ?? 0];
};
const near = (a: readonly number[], b: readonly number[]): boolean =>
  a.every((v, i) => Math.abs(v - (b[i] ?? 0)) <= 24);

/**
 * Whether `image` shows the keyboard notice `reference` (its logical frame): the box of
 * notice-background pixels is sampled back down to the reference's size and compared, so a
 * screenshot at any scale, centred on the black page, matches.
 */
export function showsNotice(image: PNG, reference: PNG): boolean {
  let [left, top, right, bottom] = [image.width, image.height, -1, -1];
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++)
      if (near(rgb(image, x, y), NOTICE_BACKGROUND)) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  if (right < 0) return false;
  const [w, h] = [right - left + 1, bottom - top + 1];
  if (Math.abs(w / h - reference.width / reference.height) > 0.05) return false;
  let same = 0;
  for (let y = 0; y < reference.height; y++)
    for (let x = 0; x < reference.width; x++) {
      const sx = left + Math.floor(((x + 0.5) * w) / reference.width);
      const sy = top + Math.floor(((y + 0.5) * h) / reference.height);
      if (near(rgb(image, sx, sy), rgb(reference, x, y))) same++;
    }
  return same >= MATCH * reference.width * reference.height;
}

/** A failure for each attached PNG that shows the keyboard notice instead of the game. */
export function noticeFailures(pngs: readonly (readonly [string, PNG])[], reference: PNG): GateFailure[] {
  return pngs
    .filter(([, image]) => showsNotice(image, reference))
    .map(([path]) => ({
      rule: "notice",
      message: `${path} shows the "needs a keyboard" notice, not the game; capture it without phone()`,
    }));
}

// What a player sees or hears: drawing code, art sources, generated art and sounds. Tests are not.
const VISIBLE = [
  /^art\//u,
  /^src\/assets\//u,
  /(?:^|\/)draw(?:\/|\.ts$)/u,
  /[aA]rt\.ts$/u,
  /\.generated\.ts$/u,
  /(?:^|\/)sounds\.ts$/u,
  /^scripts\/gen-.*\.ts$/u,
];
const visible = (file: string): boolean => !file.endsWith(".test.ts") && VISIBLE.some((re) => re.test(file));

// readdirSync(recursive) lists directories too; only an entry with an extension is a file.
const isFile = (path: string): boolean => /\.[^/.]+$/u.test(path);

/** A failure when the diff touches what the player sees or hears and the evidence directory is empty. */
export function evidenceFailures(
  changed: readonly string[],
  evidence: readonly string[],
  evidenceDir: string,
): GateFailure[] {
  const shown = changed.filter((file) => visible(file));
  if (shown.length === 0 || evidence.some((path) => isFile(path))) return [];
  return [
    {
      rule: "visual-evidence",
      message: `${evidenceDir} is empty but the diff changes what the player sees or hears: ${shown.join(", ")}`,
    },
  ];
}

/** The base the config diffs against; config.ts passes it as `base`, so sandworm's `compare` is the same ref. A stacked run is measured from it, not from its parent. */
export const BASE = "origin/main";

const referenceFrame = new URL("notice.png", import.meta.url);

/** The notice gate: no attached evidence PNG may show the keyboard notice. */
export const noticeGate: GateRule = ({ worktree, evidence }) => {
  const pngs = evidence
    .filter((path) => path.endsWith(".png"))
    .map((path) => [path, PNG.sync.read(readFileSync(`${worktree}/${path}`))] as const);
  return noticeFailures(pngs, PNG.sync.read(readFileSync(referenceFrame)));
};

/** The evidence gate: a diff the player can see or hear comes with evidence. */
export const evidenceGate: GateRule = ({ changed, evidence, evidenceDir }) =>
  evidenceFailures(changed, evidence, evidenceDir);
