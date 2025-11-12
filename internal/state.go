//go:build js

package internal

import "syscall/js"

type State struct {
	Ctx js.Value

	Width  float64
	Height float64

	Previous int
	Lag      int

	Squares []*Square
}
