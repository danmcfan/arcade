package firefly

import (
	"testing"
)

func TestAngle(t *testing.T) {
	tests := []struct {
		direction vec
		angle     float64
	}{
		{direction: vec{x: 0, y: 0}, angle: 0},
		{direction: vec{x: 0, y: -1}, angle: 0},
		{direction: vec{x: 1, y: -1}, angle: 45},
		{direction: vec{x: 1, y: 0}, angle: 90},
		{direction: vec{x: 1, y: 1}, angle: 135},
		{direction: vec{x: 0, y: 1}, angle: 180},
		{direction: vec{x: -1, y: 1}, angle: 225},
		{direction: vec{x: -1, y: 0}, angle: 270},
		{direction: vec{x: -1, y: -1}, angle: 315},
	}

	for _, test := range tests {
		angle := angle(test.direction)
		if angle != test.angle {
			t.Errorf("(%v) Expected angle %f, got %f", test.direction, test.angle, angle)
		}
	}
}

func TestFrameAngle(t *testing.T) {
	tests := []struct {
		angle float64
		row   float64
		col   float64
	}{
		{angle: 0, row: 0, col: 0},
		{angle: 15, row: 0, col: 1},
		{angle: 30, row: 0, col: 2},
		{angle: 45, row: 0, col: 3},
		{angle: 60, row: 0, col: 4},
		{angle: 75, row: 0, col: 5},
		{angle: 90, row: 1, col: 0},
		{angle: 180, row: 2, col: 0},
		{angle: 270, row: 3, col: 0},
	}

	for _, test := range tests {
		row, col := frameAngle(test.angle)
		if row != test.row {
			t.Errorf("Expected row %f, got %f", test.row, row)
		}
		if col != test.col {
			t.Errorf("Expected col %f, got %f", test.col, col)
		}
	}
}
