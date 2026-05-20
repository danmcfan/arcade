package avatar

import (
	"image"

	"github.com/ebitengine/debugui"
	"github.com/hajimehoshi/ebiten/v2"
)

const (
	width  = 160
	height = 144

	scale = 4

	tileWidth  = 16
	tileHeight = 16

	frameTotal = 6
)

var (
	ui = debugui.DebugUI{}

	player = NewPlayer()

	grassSpritesheet = NewSpritesheet("tiles/Grass/Grass_1_Middle.png", tileWidth, tileHeight)

	counter  = 0
	interval = 10

	selectedHat = 0
	hats        = []string{"none", "farmer"}

	selectedHeadKind  = 0
	selectedHeadStyle = 0
	selectedHeadTint  = 0

	selectedChestKind  = 0
	selectedChestStyle = 0
	selectedChestTint  = 0

	selectedLegsKind  = 0
	selectedLegsStyle = 0
	selectedLegsTint  = 0

	selectedFeetKind  = 0
	selectedFeetStyle = 0
	selectedFeetTint  = 0
)

type Game struct{}

func NewGame() *Game {
	return &Game{}
}

func clampSel(i *int, n int) {
	if n <= 0 {
		*i = 0
		return
	}
	if *i < 0 {
		*i = 0
	}
	if *i >= n {
		*i = n - 1
	}
}

func syncPlayerOutfit() {
	clampSel(&selectedHeadKind, len(HeadKindOptions))
	hk := HeadKindOptions[selectedHeadKind]
	headStyles := HeadStyleOptions(hk)
	clampSel(&selectedHeadStyle, len(headStyles))
	hs := headStyles[selectedHeadStyle]
	headTints := HeadTintOptions(hk, hs)
	clampSel(&selectedHeadTint, len(headTints))
	ht := headTints[selectedHeadTint]
	player.SetHead(hk, hs, ht)

	clampSel(&selectedChestKind, len(ChestKindOptions))
	ck := ChestKindOptions[selectedChestKind]
	clampSel(&selectedChestStyle, len(ChestStyleOptions))
	cs := ChestStyleOptions[selectedChestStyle]
	chestTints := ChestTintOptions(ck)
	clampSel(&selectedChestTint, len(chestTints))
	ct := chestTints[selectedChestTint]
	player.SetChest(ck, cs, ct)

	clampSel(&selectedLegsKind, len(LegsKindOptions))
	lk := LegsKindOptions[selectedLegsKind]
	clampSel(&selectedLegsStyle, len(LegsStyleOptions))
	ls := LegsStyleOptions[selectedLegsStyle]
	legsTints := LegsTintOptions(lk)
	clampSel(&selectedLegsTint, len(legsTints))
	lt := legsTints[selectedLegsTint]
	player.SetLegs(lk, ls, lt)

	clampSel(&selectedFeetKind, len(FeetKindOptions))
	fk := FeetKindOptions[selectedFeetKind]
	clampSel(&selectedFeetStyle, len(FeetStyleOptions))
	fs := FeetStyleOptions[selectedFeetStyle]
	feetTints := FeetTintOptions(fk)
	clampSel(&selectedFeetTint, len(feetTints))
	ft := feetTints[selectedFeetTint]
	player.SetFeet(fk, fs, ft)

	clampSel(&selectedHat, len(hats))
	player.SetHatSpritesheet(hats[selectedHat])
}

func (g *Game) Update() error {
	_, err := ui.Update(func(ctx *debugui.Context) error {
		ctx.Window("Debug", image.Rect(0, 0, width*scale, height*scale/4), func(layout debugui.ContainerLayout) {
			ctx.SetGridLayout([]int{-1, -6}, nil)
			ctx.Text("Hat")
			ctx.Dropdown(&selectedHat, hats)
			clampSel(&selectedHat, len(hats))

			clampSel(&selectedHeadKind, len(HeadKindOptions))
			headStyles := HeadStyleOptions(HeadKindOptions[selectedHeadKind])
			clampSel(&selectedHeadStyle, len(headStyles))
			headTints := HeadTintOptions(HeadKindOptions[selectedHeadKind], headStyles[selectedHeadStyle])
			clampSel(&selectedHeadTint, len(headTints))

			ctx.SetGridLayout([]int{-1, -2, -2, -2}, nil)
			ctx.Text("Head")
			ctx.Dropdown(&selectedHeadKind, HeadKindOptions)
			ctx.Dropdown(&selectedHeadStyle, headStyles)
			ctx.Dropdown(&selectedHeadTint, headTints)

			clampSel(&selectedChestKind, len(ChestKindOptions))
			chestTints := ChestTintOptions(ChestKindOptions[selectedChestKind])
			clampSel(&selectedChestStyle, len(ChestStyleOptions))
			clampSel(&selectedChestTint, len(chestTints))

			ctx.SetGridLayout([]int{-1, -2, -2, -2}, nil)
			ctx.Text("Chest")
			ctx.Dropdown(&selectedChestKind, ChestKindOptions)
			ctx.Dropdown(&selectedChestStyle, ChestStyleOptions)
			ctx.Dropdown(&selectedChestTint, chestTints)

			clampSel(&selectedLegsKind, len(LegsKindOptions))
			legsTints := LegsTintOptions(LegsKindOptions[selectedLegsKind])
			clampSel(&selectedLegsStyle, len(LegsStyleOptions))
			clampSel(&selectedLegsTint, len(legsTints))

			ctx.SetGridLayout([]int{-1, -2, -2, -2}, nil)
			ctx.Text("Legs")
			ctx.Dropdown(&selectedLegsKind, LegsKindOptions)
			ctx.Dropdown(&selectedLegsStyle, LegsStyleOptions)
			ctx.Dropdown(&selectedLegsTint, legsTints)

			clampSel(&selectedFeetKind, len(FeetKindOptions))
			feetTints := FeetTintOptions(FeetKindOptions[selectedFeetKind])
			clampSel(&selectedFeetStyle, len(FeetStyleOptions))
			clampSel(&selectedFeetTint, len(feetTints))

			ctx.SetGridLayout([]int{-1, -2, -2, -2}, nil)
			ctx.Text("Feet")
			ctx.Dropdown(&selectedFeetKind, FeetKindOptions)
			ctx.Dropdown(&selectedFeetStyle, FeetStyleOptions)
			ctx.Dropdown(&selectedFeetTint, feetTints)
		})
		syncPlayerOutfit()
		return nil
	})
	if err != nil {
		return err
	}

	counter++
	if counter >= interval {
		counter = 0
		player.FrameX++
		if player.FrameX >= frameTotal {
			player.FrameX = 0
		}
	}
	return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
	for x := 0; x < width; x += tileWidth {
		for y := 0; y < height; y += tileHeight {
			grassFrame := grassSpritesheet.Frame(0, 0)
			op := &ebiten.DrawImageOptions{}
			op.GeoM.Translate(float64(x), float64(y))
			op.GeoM.Scale(float64(scale), float64(scale))
			screen.DrawImage(grassFrame, op)
		}
	}

	player.Draw(screen)
	ui.Draw(screen)
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return width * scale, height * scale
}
