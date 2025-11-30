package grid

type Pattern struct {
	Choices   [4][]int
	Frequency int
}

type Patterns [3]Pattern

func NewPatterns() Patterns {
	return Patterns{
		{
			Choices:   [4][]int{{0}, {0}, {0, 1}, {0}},
			Frequency: 50,
		},
		{
			Choices:   [4][]int{{0, 1}, {0, 1}, {0, 1, 2}, {0, 1}},
			Frequency: 25,
		},
		{
			Choices:   [4][]int{{1, 2}, {1, 2}, {2}, {1, 2}},
			Frequency: 25,
		},
	}
}
