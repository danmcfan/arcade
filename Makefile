build:
	GOOS=js GOARCH=wasm go build -o main.wasm

serve:
	go run cmd/serve/main.go