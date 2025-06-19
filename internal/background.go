//go:build js

package internal

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Background struct {
	Cells      map[Sprite][]int
	Collisions []int
}

func NewBackground(filename string) (*Background, error) {
	resp, err := http.Get(fmt.Sprintf("json/%s", filename))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var background Background
	err = json.Unmarshal(body, &background)
	if err != nil {
		return nil, err
	}

	return &background, nil
}
