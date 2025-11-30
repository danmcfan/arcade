//go:build !js

package reload

import "log"

func Connect(url string) {
	log.Println("connection skipped, native build")
}
