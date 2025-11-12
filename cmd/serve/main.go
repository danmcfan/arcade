package main

import (
	"log"
	"net/http"
)

func main() {
	log.Println("serving on port 8080")
	err := http.ListenAndServe(":8080", http.FileServer(http.Dir(".")))
	if err != nil {
		log.Fatal(err)
	}
}
