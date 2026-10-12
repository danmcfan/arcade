// Command golden is the TEMPORARY Go golden harness (§4.1 of
// docs/ts-port-plan.md). It replays input scripts against the Go game and
// captures the parity fixtures under test/fixtures. Always run it under
// CGO_ENABLED=1 GOARCH=amd64 (no FMA; §0 fact 3). See test/fixtures/README.md.
//
//	golden rng                        write test/fixtures/rng.json
//	golden gen                        (re)write test/fixtures/inputs/*.json
//	golden trace <script.json>...     write test/fixtures/traces/<name>.jsonl.gz
//	golden frames <script.json>       write test/fixtures/frames/<name>/<tick>.png (opens a window)
//	golden verify                     check every captureTicks PNG exists with the right size
//	golden coverage                   assert the hive coverage list over the hive traces
package main

import (
	"flag"
	"fmt"
	"image/png"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
)

var fixtures = flag.String("fixtures", "test/fixtures", "fixtures directory")

func main() {
	flag.Usage = func() {
		fmt.Fprintln(os.Stderr, "usage: golden [-fixtures dir] rng|gen|trace|frames|verify|coverage [script.json...]")
	}
	flag.Parse()
	if runtime.GOARCH != "amd64" {
		fmt.Fprintf(os.Stderr, "golden: GOARCH is %s; fixtures must be captured with CGO_ENABLED=1 GOARCH=amd64 (no FMA)\n", runtime.GOARCH)
		os.Exit(2)
	}
	args := flag.Args()
	if len(args) == 0 {
		flag.Usage()
		os.Exit(2)
	}
	if err := run(args[0], args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "golden:", err)
		os.Exit(1)
	}
}

func run(cmd string, args []string) error {
	switch cmd {
	case "rng":
		return writeRNG(*fixtures)
	case "gen":
		return generateAll(filepath.Join(*fixtures, "inputs"))
	case "trace":
		paths, err := scriptPaths(args)
		if err != nil {
			return err
		}
		for _, p := range paths {
			s, err := loadScript(p)
			if err != nil {
				return err
			}
			n, err := writeTrace(*fixtures, s)
			if err != nil {
				return err
			}
			fmt.Printf("trace %-24s %6d ticks %8d bytes\n", s.Name, s.TotalTicks(), n)
		}
		return nil
	case "frames":
		if len(args) != 1 {
			return fmt.Errorf("frames takes exactly one script (RunGame can run once per process)")
		}
		s, err := loadScript(args[0])
		if err != nil {
			return err
		}
		if err := captureFrames(*fixtures, s); err != nil {
			return err
		}
		fmt.Printf("frames %-24s %d PNGs\n", s.Name, len(s.CaptureTicks))
		return nil
	case "verify":
		return verifyFrames(*fixtures)
	case "coverage":
		return checkCoverage(*fixtures)
	}
	return fmt.Errorf("unknown command %q", cmd)
}

// scriptPaths expands "all" (or no args) to every input script.
func scriptPaths(args []string) ([]string, error) {
	if len(args) > 0 && !(len(args) == 1 && args[0] == "all") {
		return args, nil
	}
	paths, err := filepath.Glob(filepath.Join(*fixtures, "inputs", "*.json"))
	sort.Strings(paths)
	return paths, err
}

// verifyFrames replays every script and checks each captureTicks PNG exists
// with the scene's logical size at that tick.
func verifyFrames(fixtures string) error {
	paths, err := scriptPaths(nil)
	if err != nil {
		return err
	}
	bad := 0
	total := 0
	for _, p := range paths {
		s, err := loadScript(p)
		if err != nil {
			return err
		}
		r := newRunner(s)
		for _, t := range s.CaptureTicks {
			for r.tick < t {
				r.step()
			}
			total++
			w, h := r.sc.size()
			path := filepath.Join(fixtures, "frames", s.Name, strconv.Itoa(t)+".png")
			f, err := os.Open(path)
			if err != nil {
				fmt.Printf("MISSING %s\n", path)
				bad++
				continue
			}
			cfg, err := png.DecodeConfig(f)
			f.Close()
			if err != nil || cfg.Width != w || cfg.Height != h {
				fmt.Printf("BAD     %s: got %dx%d (%v), want %dx%d\n", path, cfg.Width, cfg.Height, err, w, h)
				bad++
				continue
			}
		}
		fmt.Printf("ok      %-24s %d frames\n", s.Name, len(s.CaptureTicks))
	}
	if bad > 0 {
		return fmt.Errorf("%d of %d frames missing or wrong size", bad, total)
	}
	fmt.Printf("all %d frames present with the right dimensions\n", total)
	return nil
}
