package avatar

import "github.com/hajimehoshi/ebiten/v2"

const (
	spriteWidth  = 64
	spriteHeight = 64
)

// HeadKindOptions is tier-1 keys for SetHead (hair XOR plate helmet on HeadSpritesheet).
var HeadKindOptions = []string{"hair", "plate"}

var (
	BaseSpritesheet = NewSpritesheet("player/Player_Base/Player_Base_animations.png", spriteWidth, spriteHeight)

	HatFarmerSpritesheet = NewSpritesheet("player/Accessories/Farmer_Hat_1.png", spriteWidth, spriteHeight)

	HeadHair1Black  = NewSpritesheet("player/Head/Hair_1/Hair_1_Black.png", spriteWidth, spriteHeight)
	HeadHair1Blonde = NewSpritesheet("player/Head/Hair_1/Hair_1_Blonde.png", spriteWidth, spriteHeight)
	HeadHair1Brown  = NewSpritesheet("player/Head/Hair_1/Hair_1_Brown.png", spriteWidth, spriteHeight)
	HeadHair1Ginger = NewSpritesheet("player/Head/Hair_1/Hair_1_Ginger.png", spriteWidth, spriteHeight)
	HeadHair1Grey   = NewSpritesheet("player/Head/Hair_1/Hair_1_Grey.png", spriteWidth, spriteHeight)
	HeadHair2Black  = NewSpritesheet("player/Head/Hair_2/Hair_2_Black.png", spriteWidth, spriteHeight)
	HeadHair2Blonde = NewSpritesheet("player/Head/Hair_2/Hair_2_Blonde.png", spriteWidth, spriteHeight)
	HeadHair2Brown  = NewSpritesheet("player/Head/Hair_2/Hair_2_Brown.png", spriteWidth, spriteHeight)
	HeadHair2Ginger = NewSpritesheet("player/Head/Hair_2/Hair_2_Ginger.png", spriteWidth, spriteHeight)
	HeadHair2Grey   = NewSpritesheet("player/Head/Hair_2/Hair_2_Grey.png", spriteWidth, spriteHeight)
	HeadHair3Black  = NewSpritesheet("player/Head/Hair_3/Hair_3_Black.png", spriteWidth, spriteHeight)
	HeadHair3Blonde = NewSpritesheet("player/Head/Hair_3/Hair_3_Blonde.png", spriteWidth, spriteHeight)
	HeadHair3Brown  = NewSpritesheet("player/Head/Hair_3/Hair_3_Brown.png", spriteWidth, spriteHeight)
	HeadHair3Ginger = NewSpritesheet("player/Head/Hair_3/Hair_3_Ginger.png", spriteWidth, spriteHeight)
	HeadHair3Grey   = NewSpritesheet("player/Head/Hair_3/Hair_3_Grey.png", spriteWidth, spriteHeight)
	HeadHair4Black  = NewSpritesheet("player/Head/Hair_4/Hair_4_Black.png", spriteWidth, spriteHeight)
	HeadHair4Blonde = NewSpritesheet("player/Head/Hair_4/Hair_4_Blonde.png", spriteWidth, spriteHeight)
	HeadHair4Brown  = NewSpritesheet("player/Head/Hair_4/Hair_4_Brown.png", spriteWidth, spriteHeight)
	HeadHair4Ginger = NewSpritesheet("player/Head/Hair_4/Hair_4_Ginger.png", spriteWidth, spriteHeight)
	HeadHair4Grey   = NewSpritesheet("player/Head/Hair_4/Hair_4_Grey.png", spriteWidth, spriteHeight)
	HeadHair5Black  = NewSpritesheet("player/Head/Hair_5/Hair_5_Black.png", spriteWidth, spriteHeight)
	HeadHair5Blonde = NewSpritesheet("player/Head/Hair_5/Hair_5_Blonde.png", spriteWidth, spriteHeight)
	HeadHair5Brown  = NewSpritesheet("player/Head/Hair_5/Hair_5_Brown.png", spriteWidth, spriteHeight)
	HeadHair5Ginger = NewSpritesheet("player/Head/Hair_5/Hair_5_Ginger.png", spriteWidth, spriteHeight)
	HeadHair5Grey   = NewSpritesheet("player/Head/Hair_5/Hair_5_Grey.png", spriteWidth, spriteHeight)
	HeadHair6Black  = NewSpritesheet("player/Head/Hair_6/Hair_6_Black.png", spriteWidth, spriteHeight)
	HeadHair6Blonde = NewSpritesheet("player/Head/Hair_6/Hair_6_Blonde.png", spriteWidth, spriteHeight)
	HeadHair6Brown  = NewSpritesheet("player/Head/Hair_6/Hair_6_Brown.png", spriteWidth, spriteHeight)
	HeadHair6Ginger = NewSpritesheet("player/Head/Hair_6/Hair_6_Ginger.png", spriteWidth, spriteHeight)
	HeadHair6Grey   = NewSpritesheet("player/Head/Hair_6/Hair_6_Grey.png", spriteWidth, spriteHeight)

	HeadPlate1Blue   = NewSpritesheet("player/Head/Plate_Helmet_1/Plate_Helmet_1_Blue.png", spriteWidth, spriteHeight)
	HeadPlate1Bronze = NewSpritesheet("player/Head/Plate_Helmet_1/Plate_Helmet_1_Bronze.png", spriteWidth, spriteHeight)
	HeadPlate1Gold   = NewSpritesheet("player/Head/Plate_Helmet_1/Plate_Helmet_1_Gold.png", spriteWidth, spriteHeight)
	HeadPlate1Green  = NewSpritesheet("player/Head/Plate_Helmet_1/Plate_Helmet_1_Green.png", spriteWidth, spriteHeight)
	HeadPlate1Iron   = NewSpritesheet("player/Head/Plate_Helmet_1/Plate_Helmet_1_Iron.png", spriteWidth, spriteHeight)
	HeadPlate1Orange = NewSpritesheet("player/Head/Plate_Helmet_1/Plate_Helmet_1_Orange.png", spriteWidth, spriteHeight)
	HeadPlate1Purple = NewSpritesheet("player/Head/Plate_Helmet_1/Plate_Helmet_1_Purple.png", spriteWidth, spriteHeight)
	HeadPlate1Red    = NewSpritesheet("player/Head/Plate_Helmet_1/Plate_Helmet_1_Red.png", spriteWidth, spriteHeight)

	HeadPlate2Blue   = NewSpritesheet("player/Head/Plate_Helmet_2/Heavy_Plate_Helmet_1_Blue.png", spriteWidth, spriteHeight)
	HeadPlate2Bronze = NewSpritesheet("player/Head/Plate_Helmet_2/Heavy_Plate_Helmet_1_Bronze.png", spriteWidth, spriteHeight)
	HeadPlate2Gold   = NewSpritesheet("player/Head/Plate_Helmet_2/Heavy_Plate_Helmet_1_Gold.png", spriteWidth, spriteHeight)
	HeadPlate2Green  = NewSpritesheet("player/Head/Plate_Helmet_2/Heavy_Plate_Helmet_1_Green.png", spriteWidth, spriteHeight)
	HeadPlate2Iron   = NewSpritesheet("player/Head/Plate_Helmet_2/Heavy_Plate_Helmet_1_Iron.png", spriteWidth, spriteHeight)
	HeadPlate2Orange = NewSpritesheet("player/Head/Plate_Helmet_2/Heavy_Plate_Helmet_1_Orange.png", spriteWidth, spriteHeight)
	HeadPlate2Purple = NewSpritesheet("player/Head/Plate_Helmet_2/Heavy_Plate_Helmet_1_Purple.png", spriteWidth, spriteHeight)
	HeadPlate2Red    = NewSpritesheet("player/Head/Plate_Helmet_2/Heavy_Plate_Helmet_1_Red.png", spriteWidth, spriteHeight)

	ChestStandardShirtBlack  = NewSpritesheet("player/Chest/OG_Shirt/Shirt_1_Black.png", spriteWidth, spriteHeight)
	ChestStandardShirtBlue   = NewSpritesheet("player/Chest/OG_Shirt/Shirt_1_Blue.png", spriteWidth, spriteHeight)
	ChestStandardShirtBrown  = NewSpritesheet("player/Chest/OG_Shirt/Shirt_1_Brown.png", spriteWidth, spriteHeight)
	ChestStandardShirtGreen  = NewSpritesheet("player/Chest/OG_Shirt/Shirt_1_Green.png", spriteWidth, spriteHeight)
	ChestStandardShirtOrange = NewSpritesheet("player/Chest/OG_Shirt/Shirt_1_Orange.png", spriteWidth, spriteHeight)
	ChestStandardShirtPink   = NewSpritesheet("player/Chest/OG_Shirt/Shirt_1_Pink.png", spriteWidth, spriteHeight)
	ChestStandardShirtPurple = NewSpritesheet("player/Chest/OG_Shirt/Shirt_1_Purple.png", spriteWidth, spriteHeight)
	ChestStandardShirtRed    = NewSpritesheet("player/Chest/OG_Shirt/Shirt_1_Red.png", spriteWidth, spriteHeight)

	ChestFarmerBlack         = NewSpritesheet("player/Chest/Farmer_Shirt/Farmer_Shirt_1_Black.png", spriteWidth, spriteHeight)
	ChestFarmerBlue          = NewSpritesheet("player/Chest/Farmer_Shirt/Farmer_Shirt_1_Blue.png", spriteWidth, spriteHeight)
	ChestFarmerGreen         = NewSpritesheet("player/Chest/Farmer_Shirt/Farmer_Shirt_1_Green.png", spriteWidth, spriteHeight)
	ChestFarmerOrange        = NewSpritesheet("player/Chest/Farmer_Shirt/Farmer_Shirt_1_Orange.png", spriteWidth, spriteHeight)
	ChestFarmerPink          = NewSpritesheet("player/Chest/Farmer_Shirt/Farmer_Shirt_1_Pink.png", spriteWidth, spriteHeight)
	ChestFarmerPurple        = NewSpritesheet("player/Chest/Farmer_Shirt/Farmer_Shirt_1_Purple.png", spriteWidth, spriteHeight)
	ChestFarmerRed           = NewSpritesheet("player/Chest/Farmer_Shirt/Farmer_Shirt_1_Red.png", spriteWidth, spriteHeight)
	ChestFarmerWhiteAndBrown = NewSpritesheet("player/Chest/Farmer_Shirt/Farmer_Shirt_1_White_and_Brown.png", spriteWidth, spriteHeight)
	ChestLumberjackBlack     = NewSpritesheet("player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Black.png", spriteWidth, spriteHeight)
	ChestLumberjackBlue      = NewSpritesheet("player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Blue.png", spriteWidth, spriteHeight)
	ChestLumberjackBrown     = NewSpritesheet("player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Brown.png", spriteWidth, spriteHeight)
	ChestLumberjackGreen     = NewSpritesheet("player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Green.png", spriteWidth, spriteHeight)
	ChestLumberjackOrange    = NewSpritesheet("player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Orange.png", spriteWidth, spriteHeight)
	ChestLumberjackPink      = NewSpritesheet("player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Pink.png", spriteWidth, spriteHeight)
	ChestLumberjackPurple    = NewSpritesheet("player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Purple.png", spriteWidth, spriteHeight)
	ChestLumberjackRed       = NewSpritesheet("player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_Red.png", spriteWidth, spriteHeight)
	ChestLumberjackWhite     = NewSpritesheet("player/Chest/Lumberjack_Shirt/Lumberjack_Shirt_1_White.png", spriteWidth, spriteHeight)
	ChestRoyalBlack          = NewSpritesheet("player/Chest/Royal_Shirt/Royal_Shirt_1_Black.png", spriteWidth, spriteHeight)
	ChestRoyalBlue           = NewSpritesheet("player/Chest/Royal_Shirt/Royal_Shirt_1_Blue.png", spriteWidth, spriteHeight)
	ChestRoyalGreen          = NewSpritesheet("player/Chest/Royal_Shirt/Royal_Shirt_1_Green.png", spriteWidth, spriteHeight)
	ChestRoyalOrange         = NewSpritesheet("player/Chest/Royal_Shirt/Royal_Shirt_1_Orange.png", spriteWidth, spriteHeight)
	ChestRoyalPurple         = NewSpritesheet("player/Chest/Royal_Shirt/Royal_Shirt_1_Purple.png", spriteWidth, spriteHeight)
	ChestRoyalRed            = NewSpritesheet("player/Chest/Royal_Shirt/Royal_Shirt_1_Red.png", spriteWidth, spriteHeight)
	ChestRoyalWhite          = NewSpritesheet("player/Chest/Royal_Shirt/Royal_Shirt_1_White.png", spriteWidth, spriteHeight)
	ChestPlateBlue           = NewSpritesheet("player/Chest/Plate_Chest/Plate_Chest_Blue.png", spriteWidth, spriteHeight)
	ChestPlateBronze         = NewSpritesheet("player/Chest/Plate_Chest/Plate_Chest_Bronze.png", spriteWidth, spriteHeight)
	ChestPlateGold           = NewSpritesheet("player/Chest/Plate_Chest/Plate_Chest_Gold.png", spriteWidth, spriteHeight)
	ChestPlateGreen          = NewSpritesheet("player/Chest/Plate_Chest/Plate_Chest_Green.png", spriteWidth, spriteHeight)
	ChestPlateIron           = NewSpritesheet("player/Chest/Plate_Chest/Plate_Chest_Iron.png", spriteWidth, spriteHeight)
	ChestPlateOrange         = NewSpritesheet("player/Chest/Plate_Chest/Plate_Chest_Orange.png", spriteWidth, spriteHeight)
	ChestPlatePurple         = NewSpritesheet("player/Chest/Plate_Chest/Plate_Chest_Purple.png", spriteWidth, spriteHeight)
	ChestPlateRed            = NewSpritesheet("player/Chest/Plate_Chest/Plate_Chest_Red.png", spriteWidth, spriteHeight)

	HandsBareSpritesheet = NewSpritesheet("player/Hands/Hands_1_Bare.png", spriteWidth, spriteHeight)

	LegsStandardPantsBlack  = NewSpritesheet("player/Legs/OG_Pants/Pants_1_Black.png", spriteWidth, spriteHeight)
	LegsStandardPantsBlue   = NewSpritesheet("player/Legs/OG_Pants/Pants_1_Blue.png", spriteWidth, spriteHeight)
	LegsStandardPantsBrown  = NewSpritesheet("player/Legs/OG_Pants/Pants_1_Brown.png", spriteWidth, spriteHeight)
	LegsStandardPantsGreen  = NewSpritesheet("player/Legs/OG_Pants/Pants_1_Green.png", spriteWidth, spriteHeight)
	LegsStandardPantsOrange = NewSpritesheet("player/Legs/OG_Pants/Pants_1_Orange.png", spriteWidth, spriteHeight)
	LegsStandardPantsPink   = NewSpritesheet("player/Legs/OG_Pants/Pants_1_Pink.png", spriteWidth, spriteHeight)
	LegsStandardPantsPurple = NewSpritesheet("player/Legs/OG_Pants/Pants_1_Purple.png", spriteWidth, spriteHeight)
	LegsStandardPantsRed    = NewSpritesheet("player/Legs/OG_Pants/Pants_1_Red.png", spriteWidth, spriteHeight)

	LegsFarmerBlack         = NewSpritesheet("player/Legs/Farmer_Pants/Farmer_Pants_1_Black.png", spriteWidth, spriteHeight)
	LegsFarmerBlue          = NewSpritesheet("player/Legs/Farmer_Pants/Farmer_Pants_1_Blue.png", spriteWidth, spriteHeight)
	LegsFarmerGreen         = NewSpritesheet("player/Legs/Farmer_Pants/Farmer_Pants_1_Green.png", spriteWidth, spriteHeight)
	LegsFarmerOrange        = NewSpritesheet("player/Legs/Farmer_Pants/Farmer_Pants_1_Orange.png", spriteWidth, spriteHeight)
	LegsFarmerPink          = NewSpritesheet("player/Legs/Farmer_Pants/Farmer_Pants_1_Pink.png", spriteWidth, spriteHeight)
	LegsFarmerPurple        = NewSpritesheet("player/Legs/Farmer_Pants/Farmer_Pants_1_Purple.png", spriteWidth, spriteHeight)
	LegsFarmerRed           = NewSpritesheet("player/Legs/Farmer_Pants/Farmer_Pants_1_Red.png", spriteWidth, spriteHeight)
	LegsFarmerWhiteAndBrown = NewSpritesheet("player/Legs/Farmer_Pants/Farmer_Pants_1_White_and_Brown.png", spriteWidth, spriteHeight)
	LegsRoyalBlack          = NewSpritesheet("player/Legs/Royal_Pants/Royal_Pants_1_Black.png", spriteWidth, spriteHeight)
	LegsRoyalBlue           = NewSpritesheet("player/Legs/Royal_Pants/Royal_Pants_1_Blue.png", spriteWidth, spriteHeight)
	LegsRoyalGreen          = NewSpritesheet("player/Legs/Royal_Pants/Royal_Pants_1_Green.png", spriteWidth, spriteHeight)
	LegsRoyalOrange         = NewSpritesheet("player/Legs/Royal_Pants/Royal_Pants_1_Orange.png", spriteWidth, spriteHeight)
	LegsRoyalPurple         = NewSpritesheet("player/Legs/Royal_Pants/Royal_Pants_1_Purple.png", spriteWidth, spriteHeight)
	LegsRoyalWhite          = NewSpritesheet("player/Legs/Royal_Pants/Royal_Pants_1_White.png", spriteWidth, spriteHeight)
	LegsRoyalRed            = NewSpritesheet("player/Legs/Royal_Pants/Royal_Pantst_1_Red.png", spriteWidth, spriteHeight)
	LegsPlateBlue           = NewSpritesheet("player/Legs/Plate_Legs/Plate_Legs_Blue.png", spriteWidth, spriteHeight)
	LegsPlateBronze         = NewSpritesheet("player/Legs/Plate_Legs/Plate_Legs_Bronze.png", spriteWidth, spriteHeight)
	LegsPlateGold           = NewSpritesheet("player/Legs/Plate_Legs/Plate_Legs_Gold.png", spriteWidth, spriteHeight)
	LegsPlateGreen          = NewSpritesheet("player/Legs/Plate_Legs/Plate_Legs_Green.png", spriteWidth, spriteHeight)
	LegsPlateIron           = NewSpritesheet("player/Legs/Plate_Legs/Plate_Legs_Iron.png", spriteWidth, spriteHeight)
	LegsPlateOrange         = NewSpritesheet("player/Legs/Plate_Legs/Plate_Legs_Orange.png", spriteWidth, spriteHeight)
	LegsPlatePurple         = NewSpritesheet("player/Legs/Plate_Legs/Plate_Legs_Purple.png", spriteWidth, spriteHeight)
	LegsPlateRed            = NewSpritesheet("player/Legs/Plate_Legs/Plate_Legs_Red.png", spriteWidth, spriteHeight)

	FeetShoesBlack  = NewSpritesheet("player/Feet/Shoes_1_Black.png", spriteWidth, spriteHeight)
	FeetShoesBlue   = NewSpritesheet("player/Feet/Shoes_1_Blue.png", spriteWidth, spriteHeight)
	FeetShoesBrown  = NewSpritesheet("player/Feet/Shoes_1_Brown.png", spriteWidth, spriteHeight)
	FeetShoesGreen  = NewSpritesheet("player/Feet/Shoes_1_Green.png", spriteWidth, spriteHeight)
	FeetShoesOrange = NewSpritesheet("player/Feet/Shoes_1_Orange.png", spriteWidth, spriteHeight)
	FeetShoesPink   = NewSpritesheet("player/Feet/Shoes_1_Pink.png", spriteWidth, spriteHeight)
	FeetShoesPurple = NewSpritesheet("player/Feet/Shoes_1_Purple.png", spriteWidth, spriteHeight)
	FeetShoesRed    = NewSpritesheet("player/Feet/Shoes_1_Red.png", spriteWidth, spriteHeight)
	FeetShoesWhite  = NewSpritesheet("player/Feet/Shoes_1_White.png", spriteWidth, spriteHeight)
)

// ChestKindOptions tier-1 keys for SetChest (clothing family).
var ChestKindOptions = []string{"og", "farmer", "lumberjack", "royal", "plate"}

// ChestStyleOptions tier-2 keys; all current chest assets use unary style "1".
var ChestStyleOptions = []string{"1"}

// LegsKindOptions tier-1 keys for SetLegs.
var LegsKindOptions = []string{"og", "farmer", "royal", "plate"}

// LegsStyleOptions tier-2 keys; unary "1" for non-plate families.
var LegsStyleOptions = []string{"1"}

// FeetKindOptions tier-1 keys for SetFeet (basic shoe line).
var FeetKindOptions = []string{"og"}

// FeetStyleOptions tier-2 keys; unary "1" for Shoes_1 assets.
var FeetStyleOptions = []string{"1"}

type Player struct {
	HatSpritesheetIndex int
	HatSpritesheet      *Spritesheet

	HeadSpritesheet *Spritesheet

	ChestSpritesheet *Spritesheet

	HandsSpritesheetIndex int
	HandsSpritesheet      *Spritesheet

	LegsSpritesheet *Spritesheet

	FeetSpritesheetIndex int
	FeetSpritesheet      *Spritesheet

	FrameX int
	FrameY int
}

// HeadStyleOptions returns tier-2 keys for SetHead given kind ("hair" or "plate").
func HeadStyleOptions(kind string) []string {
	switch kind {
	case "hair":
		return []string{"1", "2", "3", "4", "5", "6"}
	case "plate":
		return []string{"1", "2"}
	default:
		return nil
	}
}

// HeadTintOptions returns tier-3 keys for SetHead; style is reserved for future per-style palettes.
func HeadTintOptions(kind, style string) []string {
	_ = style
	switch kind {
	case "hair":
		return []string{"black", "blonde", "brown", "ginger", "grey"}
	case "plate":
		return []string{"blue", "bronze", "gold", "green", "iron", "orange", "purple", "red"}
	default:
		return nil
	}
}

// ChestTintOptions returns tier-3 keys for SetChest for the given clothing family.
func ChestTintOptions(kind string) []string {
	switch kind {
	case "og":
		return []string{"black", "blue", "brown", "green", "orange", "pink", "purple", "red"}
	case "farmer":
		return []string{"black", "blue", "green", "orange", "pink", "purple", "red", "white_and_brown"}
	case "lumberjack":
		return []string{"black", "blue", "brown", "green", "orange", "pink", "purple", "red", "white"}
	case "royal":
		return []string{"black", "blue", "green", "orange", "purple", "red", "white"}
	case "plate":
		return []string{"blue", "bronze", "gold", "green", "iron", "orange", "purple", "red"}
	default:
		return nil
	}
}

// LegsTintOptions returns tier-3 keys for SetLegs.
func LegsTintOptions(kind string) []string {
	switch kind {
	case "og":
		return []string{"black", "blue", "brown", "green", "orange", "pink", "purple", "red"}
	case "farmer":
		return []string{"black", "blue", "green", "orange", "pink", "purple", "red", "white_and_brown"}
	case "royal":
		return []string{"black", "blue", "green", "orange", "purple", "red", "white"}
	case "plate":
		return []string{"blue", "bronze", "gold", "green", "iron", "orange", "purple", "red"}
	default:
		return nil
	}
}

// FeetTintOptions returns tier-3 keys for SetFeet.
func FeetTintOptions(kind string) []string {
	switch kind {
	case "og":
		return []string{"black", "blue", "brown", "green", "orange", "pink", "purple", "red", "white"}
	default:
		return nil
	}
}

func NewPlayer() *Player {
	p := &Player{
		HatSpritesheetIndex:   0,
		HatSpritesheet:        nil,
		HandsSpritesheetIndex: 0,
		HandsSpritesheet:      HandsBareSpritesheet,
		FeetSpritesheetIndex:  0,
		FeetSpritesheet:       FeetShoesBlack,
		FrameX:                0,
		FrameY:                0,
	}
	p.SetHead("hair", "1", "black")
	p.SetChest("og", "1", "black")
	p.SetLegs("og", "1", "black")
	p.SetFeet("og", "1", "black")
	return p
}

func (p *Player) Draw(screen *ebiten.Image) {
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(float64((width-BaseSpritesheet.Width)/2), float64((height-BaseSpritesheet.Height)/2))
	op.GeoM.Scale(float64(scale), float64(scale))

	baseFrame := BaseSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(baseFrame, op)

	chestFrame := p.ChestSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(chestFrame, op)

	legsFrame := p.LegsSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(legsFrame, op)

	feetFrame := p.FeetSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(feetFrame, op)

	headFrame := p.HeadSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(headFrame, op)

	if p.HatSpritesheet != nil {
		hatFrame := p.HatSpritesheet.Frame(p.FrameX, p.FrameY)
		screen.DrawImage(hatFrame, op)
	}

	handsFrame := p.HandsSpritesheet.Frame(p.FrameX, p.FrameY)
	screen.DrawImage(handsFrame, op)
}

func (p *Player) SetHatSpritesheet(hat string) {
	switch hat {
	case "none":
		p.HatSpritesheetIndex = 0
		p.HatSpritesheet = nil
	case "farmer":
		p.HatSpritesheetIndex = 1
		p.HatSpritesheet = HatFarmerSpritesheet
	}
}

// SetHead selects hair or a plate helmet for HeadSpritesheet (mutually exclusive).
func (p *Player) SetHead(kind, style, tint string) {
	switch kind {
	case "hair":
		switch style {
		case "1":
			switch tint {
			case "black":
				p.HeadSpritesheet = HeadHair1Black
			case "blonde":
				p.HeadSpritesheet = HeadHair1Blonde
			case "brown":
				p.HeadSpritesheet = HeadHair1Brown
			case "ginger":
				p.HeadSpritesheet = HeadHair1Ginger
			case "grey":
				p.HeadSpritesheet = HeadHair1Grey
			}
		case "2":
			switch tint {
			case "black":
				p.HeadSpritesheet = HeadHair2Black
			case "blonde":
				p.HeadSpritesheet = HeadHair2Blonde
			case "brown":
				p.HeadSpritesheet = HeadHair2Brown
			case "ginger":
				p.HeadSpritesheet = HeadHair2Ginger
			case "grey":
				p.HeadSpritesheet = HeadHair2Grey
			}
		case "3":
			switch tint {
			case "black":
				p.HeadSpritesheet = HeadHair3Black
			case "blonde":
				p.HeadSpritesheet = HeadHair3Blonde
			case "brown":
				p.HeadSpritesheet = HeadHair3Brown
			case "ginger":
				p.HeadSpritesheet = HeadHair3Ginger
			case "grey":
				p.HeadSpritesheet = HeadHair3Grey
			}
		case "4":
			switch tint {
			case "black":
				p.HeadSpritesheet = HeadHair4Black
			case "blonde":
				p.HeadSpritesheet = HeadHair4Blonde
			case "brown":
				p.HeadSpritesheet = HeadHair4Brown
			case "ginger":
				p.HeadSpritesheet = HeadHair4Ginger
			case "grey":
				p.HeadSpritesheet = HeadHair4Grey
			}
		case "5":
			switch tint {
			case "black":
				p.HeadSpritesheet = HeadHair5Black
			case "blonde":
				p.HeadSpritesheet = HeadHair5Blonde
			case "brown":
				p.HeadSpritesheet = HeadHair5Brown
			case "ginger":
				p.HeadSpritesheet = HeadHair5Ginger
			case "grey":
				p.HeadSpritesheet = HeadHair5Grey
			}
		case "6":
			switch tint {
			case "black":
				p.HeadSpritesheet = HeadHair6Black
			case "blonde":
				p.HeadSpritesheet = HeadHair6Blonde
			case "brown":
				p.HeadSpritesheet = HeadHair6Brown
			case "ginger":
				p.HeadSpritesheet = HeadHair6Ginger
			case "grey":
				p.HeadSpritesheet = HeadHair6Grey
			}
		}
	case "plate":
		switch style {
		case "1":
			switch tint {
			case "blue":
				p.HeadSpritesheet = HeadPlate1Blue
			case "bronze":
				p.HeadSpritesheet = HeadPlate1Bronze
			case "gold":
				p.HeadSpritesheet = HeadPlate1Gold
			case "green":
				p.HeadSpritesheet = HeadPlate1Green
			case "iron":
				p.HeadSpritesheet = HeadPlate1Iron
			case "orange":
				p.HeadSpritesheet = HeadPlate1Orange
			case "purple":
				p.HeadSpritesheet = HeadPlate1Purple
			case "red":
				p.HeadSpritesheet = HeadPlate1Red
			}
		case "2":
			switch tint {
			case "blue":
				p.HeadSpritesheet = HeadPlate2Blue
			case "bronze":
				p.HeadSpritesheet = HeadPlate2Bronze
			case "gold":
				p.HeadSpritesheet = HeadPlate2Gold
			case "green":
				p.HeadSpritesheet = HeadPlate2Green
			case "iron":
				p.HeadSpritesheet = HeadPlate2Iron
			case "orange":
				p.HeadSpritesheet = HeadPlate2Orange
			case "purple":
				p.HeadSpritesheet = HeadPlate2Purple
			case "red":
				p.HeadSpritesheet = HeadPlate2Red
			}
		}
	}
}

// SetChest selects a shirt for ChestSpritesheet; style is "1" for current assets.
func (p *Player) SetChest(kind, style, tint string) {
	switch kind {
	case "og":
		switch style {
		case "1":
			switch tint {
			case "black":
				p.ChestSpritesheet = ChestStandardShirtBlack
			case "blue":
				p.ChestSpritesheet = ChestStandardShirtBlue
			case "brown":
				p.ChestSpritesheet = ChestStandardShirtBrown
			case "green":
				p.ChestSpritesheet = ChestStandardShirtGreen
			case "orange":
				p.ChestSpritesheet = ChestStandardShirtOrange
			case "pink":
				p.ChestSpritesheet = ChestStandardShirtPink
			case "purple":
				p.ChestSpritesheet = ChestStandardShirtPurple
			case "red":
				p.ChestSpritesheet = ChestStandardShirtRed
			}
		}
	case "farmer":
		switch style {
		case "1":
			switch tint {
			case "black":
				p.ChestSpritesheet = ChestFarmerBlack
			case "blue":
				p.ChestSpritesheet = ChestFarmerBlue
			case "green":
				p.ChestSpritesheet = ChestFarmerGreen
			case "orange":
				p.ChestSpritesheet = ChestFarmerOrange
			case "pink":
				p.ChestSpritesheet = ChestFarmerPink
			case "purple":
				p.ChestSpritesheet = ChestFarmerPurple
			case "red":
				p.ChestSpritesheet = ChestFarmerRed
			case "white_and_brown":
				p.ChestSpritesheet = ChestFarmerWhiteAndBrown
			}
		}
	case "lumberjack":
		switch style {
		case "1":
			switch tint {
			case "black":
				p.ChestSpritesheet = ChestLumberjackBlack
			case "blue":
				p.ChestSpritesheet = ChestLumberjackBlue
			case "brown":
				p.ChestSpritesheet = ChestLumberjackBrown
			case "green":
				p.ChestSpritesheet = ChestLumberjackGreen
			case "orange":
				p.ChestSpritesheet = ChestLumberjackOrange
			case "pink":
				p.ChestSpritesheet = ChestLumberjackPink
			case "purple":
				p.ChestSpritesheet = ChestLumberjackPurple
			case "red":
				p.ChestSpritesheet = ChestLumberjackRed
			case "white":
				p.ChestSpritesheet = ChestLumberjackWhite
			}
		}
	case "royal":
		switch style {
		case "1":
			switch tint {
			case "black":
				p.ChestSpritesheet = ChestRoyalBlack
			case "blue":
				p.ChestSpritesheet = ChestRoyalBlue
			case "green":
				p.ChestSpritesheet = ChestRoyalGreen
			case "orange":
				p.ChestSpritesheet = ChestRoyalOrange
			case "purple":
				p.ChestSpritesheet = ChestRoyalPurple
			case "red":
				p.ChestSpritesheet = ChestRoyalRed
			case "white":
				p.ChestSpritesheet = ChestRoyalWhite
			}
		}
	case "plate":
		switch style {
		case "1":
			switch tint {
			case "blue":
				p.ChestSpritesheet = ChestPlateBlue
			case "bronze":
				p.ChestSpritesheet = ChestPlateBronze
			case "gold":
				p.ChestSpritesheet = ChestPlateGold
			case "green":
				p.ChestSpritesheet = ChestPlateGreen
			case "iron":
				p.ChestSpritesheet = ChestPlateIron
			case "orange":
				p.ChestSpritesheet = ChestPlateOrange
			case "purple":
				p.ChestSpritesheet = ChestPlatePurple
			case "red":
				p.ChestSpritesheet = ChestPlateRed
			}
		}
	}
}

// SetLegs selects pants or plate legs; royal "red" uses Royal_Pantst_1_Red.png on disk.
func (p *Player) SetLegs(kind, style, tint string) {
	switch kind {
	case "og":
		switch style {
		case "1":
			switch tint {
			case "black":
				p.LegsSpritesheet = LegsStandardPantsBlack
			case "blue":
				p.LegsSpritesheet = LegsStandardPantsBlue
			case "brown":
				p.LegsSpritesheet = LegsStandardPantsBrown
			case "green":
				p.LegsSpritesheet = LegsStandardPantsGreen
			case "orange":
				p.LegsSpritesheet = LegsStandardPantsOrange
			case "pink":
				p.LegsSpritesheet = LegsStandardPantsPink
			case "purple":
				p.LegsSpritesheet = LegsStandardPantsPurple
			case "red":
				p.LegsSpritesheet = LegsStandardPantsRed
			}
		}
	case "farmer":
		switch style {
		case "1":
			switch tint {
			case "black":
				p.LegsSpritesheet = LegsFarmerBlack
			case "blue":
				p.LegsSpritesheet = LegsFarmerBlue
			case "green":
				p.LegsSpritesheet = LegsFarmerGreen
			case "orange":
				p.LegsSpritesheet = LegsFarmerOrange
			case "pink":
				p.LegsSpritesheet = LegsFarmerPink
			case "purple":
				p.LegsSpritesheet = LegsFarmerPurple
			case "red":
				p.LegsSpritesheet = LegsFarmerRed
			case "white_and_brown":
				p.LegsSpritesheet = LegsFarmerWhiteAndBrown
			}
		}
	case "royal":
		switch style {
		case "1":
			switch tint {
			case "black":
				p.LegsSpritesheet = LegsRoyalBlack
			case "blue":
				p.LegsSpritesheet = LegsRoyalBlue
			case "green":
				p.LegsSpritesheet = LegsRoyalGreen
			case "orange":
				p.LegsSpritesheet = LegsRoyalOrange
			case "purple":
				p.LegsSpritesheet = LegsRoyalPurple
			case "white":
				p.LegsSpritesheet = LegsRoyalWhite
			case "red":
				p.LegsSpritesheet = LegsRoyalRed
			}
		}
	case "plate":
		switch style {
		case "1":
			switch tint {
			case "blue":
				p.LegsSpritesheet = LegsPlateBlue
			case "bronze":
				p.LegsSpritesheet = LegsPlateBronze
			case "gold":
				p.LegsSpritesheet = LegsPlateGold
			case "green":
				p.LegsSpritesheet = LegsPlateGreen
			case "iron":
				p.LegsSpritesheet = LegsPlateIron
			case "orange":
				p.LegsSpritesheet = LegsPlateOrange
			case "purple":
				p.LegsSpritesheet = LegsPlatePurple
			case "red":
				p.LegsSpritesheet = LegsPlateRed
			}
		}
	}
}

// SetFeet selects shoes for FeetSpritesheet; style is "1" for current Shoes_1 assets.
func (p *Player) SetFeet(kind, style, tint string) {
	switch kind {
	case "og":
		switch style {
		case "1":
			switch tint {
			case "black":
				p.FeetSpritesheet = FeetShoesBlack
			case "blue":
				p.FeetSpritesheet = FeetShoesBlue
			case "brown":
				p.FeetSpritesheet = FeetShoesBrown
			case "green":
				p.FeetSpritesheet = FeetShoesGreen
			case "orange":
				p.FeetSpritesheet = FeetShoesOrange
			case "pink":
				p.FeetSpritesheet = FeetShoesPink
			case "purple":
				p.FeetSpritesheet = FeetShoesPurple
			case "red":
				p.FeetSpritesheet = FeetShoesRed
			case "white":
				p.FeetSpritesheet = FeetShoesWhite
			}
		}
	}
}
