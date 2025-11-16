//go:build !js

package internal

import "log"

func Connect(url string) {
	log.Println("connection skipped, native build")
}
