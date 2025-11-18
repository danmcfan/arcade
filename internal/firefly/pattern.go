package firefly

const (
	FRAMES_PER_SECOND = 60
)

type patternFunc func(t float64) vec

type bezierConfig struct {
	p0 vec
	p1 vec
	p2 vec
	p3 vec
}

func NewBezierPatternFunc(config bezierConfig) patternFunc {
	return func(t float64) vec {
		tt := t * t
		ttt := t * t * t

		u := 1 - t
		uu := u * u
		uuu := uu * u

		x := uuu*config.p0.x + 3*uu*t*config.p1.x + 3*u*tt*config.p2.x + ttt*config.p3.x
		y := uuu*config.p0.y + 3*uu*t*config.p1.y + 3*u*tt*config.p2.y + ttt*config.p3.y

		return vec{x: x, y: y}
	}
}
