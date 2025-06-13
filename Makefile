build:
	GOOS=js GOARCH=wasm go build -o ./web/main.wasm ./cmd/client/main.go

serve:
	go run ./cmd/server

.PHONY: build serve