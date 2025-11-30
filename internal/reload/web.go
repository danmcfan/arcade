//go:build js

package reload

import (
	"log"
	"syscall/js"
	"time"
)

const (
	DelaySeconds = 1
	MaxAttempts  = 3
)

func Connect(url string) {
	local := js.Global().Get("location").Get("protocol").String() == "http:"
	if local {
		attempts := 0
		connectWithReload(url, false, attempts)
	}
}

func connectWithReload(url string, reload bool, attempts int) {
	// Use the browser's WebSocket API
	ws := js.Global().Get("WebSocket").New(url)

	// Handle connection open
	ws.Set("onopen", js.FuncOf(func(this js.Value, args []js.Value) any {
		log.Println("websocket connected to", url)

		if reload {
			log.Println("reloading page")
			js.Global().Get("location").Call("reload")
		}
		return nil
	}))

	// Handle incoming messages
	ws.Set("onmessage", js.FuncOf(func(this js.Value, args []js.Value) any {
		event := args[0]
		data := event.Get("data").String()
		log.Printf("websocket received: %s", data)
		return nil
	}))

	// Handle connection close - refresh the page
	ws.Set("onclose", js.FuncOf(func(this js.Value, args []js.Value) any {
		log.Printf("websocket disconnected")

		if attempts >= MaxAttempts {
			log.Println("max attempts reached")
			return nil
		}

		go func() {
			attempts++
			time.Sleep(DelaySeconds * time.Second)
			connectWithReload(url, true, attempts)
		}()

		return nil
	}))

	// Handle errors
	ws.Set("onerror", js.FuncOf(func(this js.Value, args []js.Value) any {
		log.Println("websocket error occurred")
		return nil
	}))
}
