package main

import (
	"bufio"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Coverage checker (§4.4): reads the gzipped JSONL traces and asserts the
// hive coverage list across all hive-* scenarios, plus the firefly-play and
// lumberjack-chop must-cover items.

type covEnemy struct {
	X, Y float64
	Blue int
}

type covHive struct {
	State   string
	Player  struct{ X, Y float64 }
	Enemies []covEnemy
	Items   int
	Score   int
	Lives   int
	ModeIdx int `json:"modeIndex"`
	Popups  []struct{ FrameIdx int }
}

type covBug struct {
	X, Y       float64
	Duration   float64
	DeadFrames int
}

type covFirefly struct {
	Bullets []struct{ X, Y float64 }
	Bugs    []covBug
}

type covLine struct {
	Tick     int
	Software *string
	Arcade   struct{ HighScore int }
	Sw       json.RawMessage
	Sounds   []string
	// lumberjack
	Player *struct {
		X, Y   float64
		Dir    string
		Moving bool
	}
	Trees []struct {
		Shaking, ShakeRight, Transparent, Behind bool
		Health                                   float64
	}
}

func readTrace(path string) ([]covLine, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	zr, err := gzip.NewReader(f)
	if err != nil {
		return nil, err
	}
	var out []covLine
	sc := bufio.NewScanner(zr)
	sc.Buffer(make([]byte, 1<<20), 64<<20)
	for sc.Scan() {
		var l covLine
		if err := json.Unmarshal(sc.Bytes(), &l); err != nil {
			return nil, fmt.Errorf("%s line %d: %w", path, len(out)+1, err)
		}
		if l.Tick != len(out)+1 {
			return nil, fmt.Errorf("%s line %d has tick %d", path, len(out)+1, l.Tick)
		}
		out = append(out, l)
	}
	return out, sc.Err()
}

type coverage struct {
	hits  map[string][]string // item -> scenarios
	order []string
}

func newCoverage(items ...string) *coverage {
	return &coverage{hits: map[string][]string{}, order: items}
}

func (c *coverage) hit(item, scenario string) {
	for _, s := range c.hits[item] {
		if s == scenario {
			return
		}
	}
	c.hits[item] = append(c.hits[item], scenario)
}

func (c *coverage) report(title string) int {
	fmt.Println(title)
	missing := 0
	for _, it := range c.order {
		if len(c.hits[it]) == 0 {
			fmt.Printf("  MISSING %-36s\n", it)
			missing++
			continue
		}
		fmt.Printf("  ok      %-36s %s\n", it, strings.Join(c.hits[it], ", "))
	}
	return missing
}

func hiveOf(l *covLine) *covHive {
	if l.Software == nil || *l.Software != "hive" {
		return nil
	}
	var h covHive
	if err := json.Unmarshal(l.Sw, &h); err != nil {
		panic(err)
	}
	return &h
}

func checkCoverage(fixtures string) error {
	paths, _ := filepath.Glob(filepath.Join(fixtures, "traces", "hive-*.jsonl.gz"))
	sort.Strings(paths)
	if len(paths) == 0 {
		return fmt.Errorf("no hive traces under %s", fixtures)
	}
	modeItems := []string{}
	for i := 1; i <= 8; i++ {
		modeItems = append(modeItems, fmt.Sprintf("modeIndex %d (entered modeSequence[%d])", i, i-1))
	}
	hc := newCoverage(append([]string{
		"power pellet eaten",
		"bee eaten: PAUSE + 200",
		"bee eaten: PAUSE + 400",
		"popup + particles",
		"tunnel wrap (player)",
		"tunnel wrap (bee)",
		"death: PLAY -> DEATHWAIT",
		"death: DEATHWAIT -> START",
		"final death: PLAY -> FINALDEATHWAIT",
		"final death: GAMEOVER -> hub, highScore",
		"round win: all items eaten -> START",
		"hub high score passed to new hive",
	}, modeItems...)...)

	for _, p := range paths {
		name := strings.TrimSuffix(filepath.Base(p), ".jsonl.gz")
		lines, err := readTrace(p)
		if err != nil {
			return err
		}
		lastHub := 0
		for i := 1; i < len(lines); i++ {
			prevL, curL := &lines[i-1], &lines[i]
			prev, cur := hiveOf(prevL), hiveOf(curL)
			if prev != nil && cur == nil && curL.Software == nil {
				if prev.State == "FINALDEATHWAIT" && curL.Arcade.HighScore == max(prevL.Arcade.HighScore, prev.Score) {
					hc.hit("final death: GAMEOVER -> hub, highScore", name)
					lastHub = curL.Arcade.HighScore
				}
			}
			if prev == nil && cur != nil && lastHub > 0 {
				var hs struct{ HighScore int }
				json.Unmarshal(curL.Sw, &hs)
				if hs.HighScore == lastHub {
					hc.hit("hub high score passed to new hive", name)
				}
			}
			if prev == nil || cur == nil {
				continue
			}
			d := cur.Score - prev.Score
			if d == 50 {
				for _, e := range cur.Enemies {
					if e.Blue == 600 {
						hc.hit("power pellet eaten", name)
					}
				}
			}
			if prev.State == "PLAY" && cur.State == "PAUSE" {
				switch d {
				case 200:
					hc.hit("bee eaten: PAUSE + 200", name)
				case 400:
					hc.hit("bee eaten: PAUSE + 400", name)
				}
			}
			if len(cur.Popups) > 0 {
				hc.hit("popup + particles", name)
			}
			if math.Abs(cur.Player.X-prev.Player.X) > 100 && cur.Player.Y == 140 {
				hc.hit("tunnel wrap (player)", name)
			}
			for j := range cur.Enemies {
				a, b := prev.Enemies[j], cur.Enemies[j]
				if a.Y == 140 && b.Y == 140 && math.Abs(a.X-b.X) > 200 {
					hc.hit("tunnel wrap (bee)", name)
				}
			}
			switch {
			case prev.State == "PLAY" && cur.State == "DEATHWAIT":
				hc.hit("death: PLAY -> DEATHWAIT", name)
			case prev.State == "DEATHWAIT" && cur.State == "START":
				hc.hit("death: DEATHWAIT -> START", name)
			case prev.State == "PLAY" && cur.State == "FINALDEATHWAIT":
				hc.hit("final death: PLAY -> FINALDEATHWAIT", name)
			case prev.State == "PLAY" && cur.State == "START" && prev.Items == 0 && cur.Items > 0:
				hc.hit("round win: all items eaten -> START", name)
			}
			if cur.ModeIdx >= 1 && cur.ModeIdx <= 8 {
				hc.hit(modeItems[cur.ModeIdx-1], name)
			}
		}
	}
	missing := hc.report(fmt.Sprintf("hive coverage over %d traces:", len(paths)))

	if lines, err := readTrace(filepath.Join(fixtures, "traces", "firefly-play.jsonl.gz")); err == nil {
		fc := newCoverage("bullet fired", "bullet hits bug", "explosion (deadFrames > 0)",
			"wave cleared: bugs [] then respawn", "bug exits off the top", "bullet hits unspawned bug at (0,0)")
		for i, l := range lines {
			if l.Software == nil || *l.Software != "firefly" {
				continue
			}
			var f covFirefly
			json.Unmarshal(l.Sw, &f)
			for _, s := range l.Sounds {
				if s == "play:laser" {
					fc.hit("bullet fired", "firefly-play")
				}
				if s == "play:boom" {
					fc.hit("bullet hits bug", "firefly-play")
				}
			}
			for _, b := range f.Bugs {
				if b.DeadFrames > 0 {
					fc.hit("explosion (deadFrames > 0)", "firefly-play")
				}
				if b.DeadFrames == 74 && b.Duration < 0 && b.X == 0 && b.Y == 0 {
					fc.hit("bullet hits unspawned bug at (0,0)", "firefly-play")
				}
				if b.DeadFrames == 0 && b.Duration > 1 && b.Y < 2.5 {
					fc.hit("bug exits off the top", "firefly-play")
				}
			}
			if len(f.Bugs) == 0 && i+1 < len(lines) {
				var n covFirefly
				json.Unmarshal(lines[i+1].Sw, &n)
				if len(n.Bugs) == 10 {
					fc.hit("wave cleared: bugs [] then respawn", "firefly-play")
				}
			}
		}
		missing += fc.report("firefly-play coverage:")
	} else {
		return err
	}

	if lines, err := readTrace(filepath.Join(fixtures, "traces", "lumberjack-chop.jsonl.gz")); err == nil {
		lc := newCoverage("tree shakes right", "tree shakes left", "tree health <= 0", "chopped past 0 (health <= -100)",
			"tree transparent (behind)", "Up+Down held (moving, faces DOWN)")
		for i, l := range lines {
			for _, t := range l.Trees {
				if t.Shaking && t.ShakeRight {
					lc.hit("tree shakes right", "lumberjack-chop")
				}
				if t.Shaking && !t.ShakeRight {
					lc.hit("tree shakes left", "lumberjack-chop")
				}
				if t.Health <= 0 {
					lc.hit("tree health <= 0", "lumberjack-chop")
				}
				if t.Health <= -100 {
					lc.hit("chopped past 0 (health <= -100)", "lumberjack-chop")
				}
				if t.Transparent {
					lc.hit("tree transparent (behind)", "lumberjack-chop")
				}
			}
			if i > 0 && l.Player != nil && lines[i-1].Player != nil && l.Player.Dir == "DOWN" && l.Player.Moving &&
				l.Player.Y == lines[i-1].Player.Y && l.Player.X == lines[i-1].Player.X {
				// Moving and facing down without moving: Up then Down applied.
				lc.hit("Up+Down held (moving, faces DOWN)", "lumberjack-chop")
			}
		}
		missing += lc.report("lumberjack-chop coverage:")
	} else {
		return err
	}

	if missing > 0 {
		return fmt.Errorf("%d coverage items missing", missing)
	}
	fmt.Println("coverage OK")
	return nil
}
