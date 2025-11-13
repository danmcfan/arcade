build:
	GOOS=js GOARCH=wasm go build -o main.wasm

serve:
	go build -o ./cmd/serve ./cmd/serve.go
	./cmd/serve