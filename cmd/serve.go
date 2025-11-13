package main

import (
	"log"
	"net/http"

	"golang.org/x/net/websocket"
)

func handleWebSocket(ws *websocket.Conn) {
	defer ws.Close()

	log.Println("new websocket connection")

	// Send a welcome message
	msg := []byte("connected to server")
	if _, err := ws.Write(msg); err != nil {
		log.Println("websocket write error:", err)
		return
	}

	// Keep connection alive and handle incoming messages
	for {
		var data = make([]byte, 512)
		n, err := ws.Read(data)
		if err != nil {
			log.Println("websocket read error:", err)
			break
		}

		log.Printf("received: %s", data[:n])

		// Echo back the message
		if _, err := ws.Write(data[:n]); err != nil {
			log.Println("websocket write error:", err)
			break
		}
	}

	log.Println("websocket connection closed")
}

func main() {
	// Set up the websocket handler
	http.Handle("/ws", websocket.Handler(handleWebSocket))

	// Serve static files for all other routes
	http.Handle("/", http.FileServer(http.Dir(".")))

	log.Println("serving on port 8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal(err)
	}
}
