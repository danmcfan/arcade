package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"

	"github.com/danmcfan/arcade/internal/input"
)

// Script is the §4.2 input script (InputScript in src/game/script.ts).
type Script struct {
	Name         string    `json:"name"`
	Scene        string    `json:"scene"`
	Software     string    `json:"software,omitempty"`
	Seed         uint32    `json:"seed"`
	Wave         *WaveOpts `json:"wave,omitempty"`
	CaptureTicks []int     `json:"captureTicks"`
	Steps        []Step    `json:"steps"`
}

type WaveOpts struct {
	GridSize int `json:"gridSize"`
	Seconds  int `json:"seconds"`
}

type Step struct {
	Ticks int     `json:"ticks"`
	Input InputJS `json:"input"`
}

// InputJS is Partial<Input>: missing keys are false.
type InputJS struct {
	Up     bool `json:"up,omitempty"`
	Down   bool `json:"down,omitempty"`
	Left   bool `json:"left,omitempty"`
	Right  bool `json:"right,omitempty"`
	Space  bool `json:"space,omitempty"`
	Escape bool `json:"escape,omitempty"`
	ShiftP bool `json:"shiftP,omitempty"`
}

func (i InputJS) toInput() input.Input {
	return input.Input{Up: i.Up, Down: i.Down, Left: i.Left, Right: i.Right, Space: i.Space, Escape: i.Escape, ShiftP: i.ShiftP}
}

// Expand mirrors expandSteps in src/game/script.ts: one Input per tick
// (index 0 = tick 1); shiftP is "just pressed" on a step's first tick only.
func (s *Script) Expand() []input.Input {
	var out []input.Input
	for _, st := range s.Steps {
		for t := 0; t < st.Ticks; t++ {
			in := st.Input.toInput()
			if t > 0 {
				in.ShiftP = false
			}
			out = append(out, in)
		}
	}
	return out
}

func (s *Script) TotalTicks() int {
	n := 0
	for _, st := range s.Steps {
		n += st.Ticks
	}
	return n
}

func (s *Script) validate() error {
	switch s.Scene {
	case "game":
		switch s.Software {
		case "", "hive", "firefly", "gearhead":
		default:
			return fmt.Errorf("%s: unknown software %q", s.Name, s.Software)
		}
	case "wave", "lumberjack":
		if s.Software != "" {
			return fmt.Errorf("%s: software only applies to scene game", s.Name)
		}
	default:
		return fmt.Errorf("%s: unknown scene %q", s.Name, s.Scene)
	}
	if s.Wave != nil && s.Scene != "wave" {
		return fmt.Errorf("%s: wave options only apply to scene wave", s.Name)
	}
	for i, st := range s.Steps {
		if st.Ticks < 1 {
			return fmt.Errorf("%s: step %d has ticks %d", s.Name, i, st.Ticks)
		}
	}
	total := s.TotalTicks()
	if !slices.IsSorted(s.CaptureTicks) {
		return fmt.Errorf("%s: captureTicks not sorted", s.Name)
	}
	for _, t := range s.CaptureTicks {
		if t < 1 || t > total {
			return fmt.Errorf("%s: capture tick %d outside 1..%d", s.Name, t, total)
		}
	}
	return nil
}

func loadScript(path string) (*Script, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	var s Script
	if err := dec.Decode(&s); err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	if s.CaptureTicks == nil {
		s.CaptureTicks = []int{}
	}
	if err := s.validate(); err != nil {
		return nil, err
	}
	return &s, nil
}

// saveScript writes one step per line so diffs stay readable.
func saveScript(dir string, s *Script) error {
	if err := s.validate(); err != nil {
		return err
	}
	if s.CaptureTicks == nil {
		s.CaptureTicks = []int{}
	}
	var b bytes.Buffer
	head := *s
	head.Steps = nil
	hj, err := json.Marshal(head)
	if err != nil {
		return err
	}
	// Re-open the object to append steps line by line.
	b.Write(hj[:len(hj)-len(`"steps":null}`)])
	b.WriteString("\"steps\": [\n")
	for i, st := range s.Steps {
		sj, err := json.Marshal(st)
		if err != nil {
			return err
		}
		b.WriteString("  ")
		b.Write(sj)
		if i < len(s.Steps)-1 {
			b.WriteByte(',')
		}
		b.WriteByte('\n')
	}
	b.WriteString("]}\n")
	// Sanity: must round-trip.
	var check Script
	if err := json.Unmarshal(b.Bytes(), &check); err != nil {
		return fmt.Errorf("%s: bad script json: %w", s.Name, err)
	}
	return os.WriteFile(filepath.Join(dir, s.Name+".json"), b.Bytes(), 0o644)
}
