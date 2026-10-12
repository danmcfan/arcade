package main

import (
	"fmt"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"strconv"

	"github.com/hajimehoshi/ebiten/v2"
)

// frameGame runs a script inside ebiten.RunGame (ReadPixels needs a running
// game). Each Update advances the script to the next capture tick; the
// following Draw renders the scene into a cleared offscreen image at the
// logical resolution and writes it as a PNG. This is valid because no Draw
// path mutates game state (§0 fact 2).
type frameGame struct {
	r        *runner
	outDir   string
	idx      int  // next capture index
	pending  bool // a capture is waiting for Draw
	last     *ebiten.Image
	err      error
	captured []string
}

func (f *frameGame) Update() error {
	if f.err != nil {
		return f.err
	}
	if f.pending {
		return nil
	}
	ticks := f.r.script.CaptureTicks
	if f.idx >= len(ticks) {
		return ebiten.Termination
	}
	for f.r.tick < ticks[f.idx] {
		f.r.step()
		f.r.sounds = f.r.sounds[:0]
	}
	f.pending = true
	return nil
}

func (f *frameGame) Draw(screen *ebiten.Image) {
	if f.pending {
		w, h := f.r.sc.size()
		off := ebiten.NewImage(w, h)
		f.r.sc.draw(off)
		pix := make([]byte, 4*w*h)
		off.ReadPixels(pix)
		// ReadPixels returns alpha-premultiplied RGBA, which is exactly
		// image.RGBA's definition; png.Encode un-premultiplies.
		img := &image.RGBA{Pix: pix, Stride: 4 * w, Rect: image.Rect(0, 0, w, h)}
		tick := f.r.script.CaptureTicks[f.idx]
		path := filepath.Join(f.outDir, strconv.Itoa(tick)+".png")
		if err := writePNG(path, img); err != nil {
			f.err = err
		}
		f.captured = append(f.captured, path)
		if f.last != nil {
			f.last.Deallocate()
		}
		f.last = off
		f.idx++
		f.pending = false
	}
	if f.last != nil {
		screen.DrawImage(f.last, nil)
	}
}

func (f *frameGame) Layout(int, int) (int, int) {
	if f.last != nil {
		b := f.last.Bounds()
		return b.Dx(), b.Dy()
	}
	return f.r.sc.size()
}

func writePNG(path string, img image.Image) error {
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	enc := png.Encoder{CompressionLevel: png.BestCompression}
	if err := enc.Encode(file, img); err != nil {
		file.Close()
		return err
	}
	return file.Close()
}

// captureFrames must be the only RunGame in the process.
func captureFrames(fixtures string, s *Script) error {
	outDir := filepath.Join(fixtures, "frames", s.Name)
	if err := os.RemoveAll(outDir); err != nil {
		return err
	}
	if len(s.CaptureTicks) == 0 {
		return nil
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}
	f := &frameGame{r: newRunner(s), outDir: outDir}
	w, h := f.r.sc.size()
	for w > 1000 || h > 1000 {
		w, h = w/2, h/2
	}
	ebiten.SetWindowSize(w*2, h*2)
	ebiten.SetWindowTitle("golden frames: " + s.Name)
	ebiten.SetWindowResizingMode(ebiten.WindowResizingModeEnabled)
	if err := ebiten.RunGame(f); err != nil {
		return err
	}
	if f.err != nil {
		return f.err
	}
	if len(f.captured) != len(s.CaptureTicks) {
		return fmt.Errorf("%s: captured %d of %d frames", s.Name, len(f.captured), len(s.CaptureTicks))
	}
	return nil
}
