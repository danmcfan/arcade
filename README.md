# Arcade

Pixel art games within a game. Walk around an arcade, step up to a cabinet, and play the minigame inside.

**Play it in the browser:** https://arcade.dannyobrien.dev/

## Versions

The repo currently holds two implementations:

- **Go + [Ebitengine](https://ebitengine.org/)**: the main version, compiled to WebAssembly and deployed to GitHub Pages. Minigames live under `internal/` (`firefly`, `gearhead`, `hive`, `lumberjack`, `wave`).
- **Odin + [raylib](https://www.raylib.com/)**: an early port in `main.odin`. It renders a 160×144 screen with a walkable player; assets are embedded in the binary.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Space | Interact / action |
| Esc | Back |
| Shift+P | Toggle debug |

## Running

### Go (native)

```sh
go run .
```

### Go (web)

```sh
make build   # builds main.wasm
make serve   # builds and starts the local dev server
```

Then open `index.html` through the server. Pushes to `main` deploy the repo root to GitHub Pages.

### Odin

```sh
odin run .
```

Requires the [Odin compiler](https://odin-lang.org/); raylib ships with it as `vendor:raylib`.
