build/client:
	GOOS=js GOARCH=wasm go build -o ./web/main.wasm ./cmd/client/main.go

build/server:
	go build -o ./tmp/server ./cmd/server/main.go

run/server:
	go run ./cmd/server

live/client:
	air --build.cmd="make build/client" \
		--build.bin=true \
		--build.include_dir="cmd,internal" \
		--build.include_ext=go \
		--build.delay=100 \
		--misc.clean_on_exit=true

live/server:
	air --build.cmd="make build/server" \
		--build.bin="./tmp/server" \
		--build.send_interrupt=true \
		--build.include_dir=web \
		--build.include_ext=html,css,js,wasm,svg,png \
		--build.delay=100 \
		--misc.clean_on_exit=true

.PHONY: build/client build/server run/server live/client live/server