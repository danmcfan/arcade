package main

import (
	"log"
	"net/http"

	"golang.org/x/net/websocket"
)

func main() {
	handleWebsocket := func(ws *websocket.Conn) {
		log.Println("WebSocket connected...")

		var message string
		for {
			err := websocket.Message.Receive(ws, &message)
			if err != nil {
				return
			}
			log.Println("Received message: ", message)

			// err = websocket.Message.Send(ws, "pong")
			// if err != nil {
			// 	return
			// }
		}
	}

	http.Handle("/", http.FileServer(http.Dir("web")))
	http.Handle("/ws", websocket.Handler(handleWebsocket))

	log.Println("Server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// package main

// import (
// 	"context"
// 	"fmt"
// 	"net/http"
// 	"os"
// 	"os/signal"
// 	"syscall"
// 	"time"

// 	"github.com/danmcfan/arcade-go/internal"
// 	"golang.org/x/net/websocket"
// )

// func main() {
// 	websocketHandler := func(ws *websocket.Conn) {
// 		fmt.Println("WebSocket connected...")

// 		var message string
// 		for {
// 			err := websocket.Message.Receive(ws, &message)
// 			if err != nil {
// 				fmt.Printf("Error receiving message: %v\n", err)
// 				return
// 			}

// 			time.Sleep(5 * time.Second)

// 			err = websocket.Message.Send(ws, "pong")
// 			if err != nil {
// 				fmt.Printf("Error sending message: %v\n", err)
// 				return
// 			}
// 		}
// 	}

// 	handler := http.NewServeMux()
// 	handler.Handle("/", http.FileServer(http.FS(internal.AssetFiles())))
// 	handler.Handle("/ws", websocket.Handler(websocketHandler))

// 	server := &http.Server{
// 		Addr:    ":8080",
// 		Handler: handler,
// 	}

// 	// Channel to listen for errors coming from the listener.
// 	serverErrors := make(chan error, 1)

// 	// Start the service listening for requests.
// 	go func() {
// 		fmt.Println("Starting server on port 8080...")
// 		serverErrors <- server.ListenAndServe()
// 	}()

// 	// Channel to listen for an interrupt or terminate signal from the OS.
// 	shutdown := make(chan os.Signal, 1)
// 	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

// 	// Blocking main and waiting for shutdown.
// 	select {
// 	case err := <-serverErrors:
// 		fmt.Printf("Error starting server: %v\n", err)
// 		server.Close()

// 	case sig := <-shutdown:
// 		fmt.Printf("Server is shutting down due to %v signal\n", sig)

// 		// Give outstanding requests 5 seconds to complete.
// 		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
// 		defer cancel()

// 		if err := server.Shutdown(ctx); err != nil {
// 			fmt.Printf("Could not stop server gracefully: %v\n", err)
// 			server.Close()
// 		}
// 	}
// }
