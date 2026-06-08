package main

import "core:math"
import rl "vendor:raylib"

ARCADE_PNG :: #load("assets/arcade.png")
GAMER_PNG :: #load("assets/gamer.png")

width :: 160
height :: 144
scale :: 4

step :: 1.0 / 60.0

player_sprite_width :: 16
player_sprite_height :: 24

player_speed :: 1.0

accumulator: f32 = 0.0

camera: rl.Camera2D
arcade_texture: rl.Texture2D
gamer_texture: rl.Texture2D

player_source: rl.Rectangle
player_destination: rl.Rectangle

player_moving: bool = false
player_row: int = 1

player_frame: f32 = 0
player_frame_total: f32 = 4.0
player_frame_increment: f32 = 4.0 * step

main :: proc() {
	init()

	for !rl.WindowShouldClose() {
		accumulator += rl.GetFrameTime()
		for accumulator >= step {
			update()
			accumulator -= step
		}

		draw()
	}

	cleanup()
}

init :: proc() {
	rl.InitWindow(width * scale, height * scale, "Arcade")
	rl.SetTargetFPS(60)

	camera = rl.Camera2D {
		offset   = {width * scale * 0.5, height * scale * 0.5},
		target   = {width * 0.5, height * 0.5},
		rotation = 0,
		zoom     = scale,
	}

	arcade_texture = load_texture_from_bytes(ARCADE_PNG, ".png")
	gamer_texture = load_texture_from_bytes(GAMER_PNG, ".png")

	player_source = rl.Rectangle {
		x      = 0,
		y      = player_sprite_height,
		width  = player_sprite_width,
		height = player_sprite_height,
	}

	player_destination = rl.Rectangle {
		x      = width * 0.5,
		y      = height * 0.6,
		width  = player_sprite_width,
		height = player_sprite_height,
	}
}

load_texture_from_bytes :: proc(bytes: []u8, file_type: cstring) -> rl.Texture2D {
	image := rl.LoadImageFromMemory(file_type, raw_data(bytes), i32(len(bytes)))
	texture := rl.LoadTextureFromImage(image)
	rl.UnloadImage(image)
	return texture
}

cleanup :: proc() {
	rl.UnloadTexture(arcade_texture)
	rl.UnloadTexture(gamer_texture)

	rl.CloseWindow()
}

update :: proc() {
	movement := rl.Vector2{0, 0}
	player_moving = false

	if rl.IsKeyDown(.W) || rl.IsKeyDown(.UP) {
		movement.y -= player_speed
		player_row = 0
	}
	if rl.IsKeyDown(.S) || rl.IsKeyDown(.DOWN) {
		movement.y += player_speed
		player_row = 1
	}
	if rl.IsKeyDown(.A) || rl.IsKeyDown(.LEFT) {
		movement.x -= player_speed
		player_row = 2
	}
	if rl.IsKeyDown(.D) || rl.IsKeyDown(.RIGHT) {
		movement.x += player_speed
		player_row = 3
	}

	if movement.x != 0 || movement.y != 0 {
		player_moving = true
		length := math.sqrt(movement.x * movement.x + movement.y * movement.y)
		movement.x /= length
		movement.y /= length
	}

	player_destination.x += movement.x
	player_destination.y += movement.y

	player_destination.x = clamp(player_destination.x, 31, 129)
	player_destination.y = clamp(player_destination.y, 50, 110)

	if player_moving {
		player_frame += player_frame_increment
		if player_frame >= player_frame_total {
			player_frame -= player_frame_total
		}
	} else {
		player_frame = 0
	}

	player_source.x = f32(int(player_frame)) * player_sprite_width
	player_source.y = f32(player_row) * player_sprite_height
}

draw :: proc() {
	rl.BeginDrawing()
	rl.ClearBackground(rl.BLACK)

	rl.BeginMode2D(camera)

	rl.DrawTexture(arcade_texture, 0, 0, rl.WHITE)
	draw_player()

	rl.EndMode2D()
	rl.EndDrawing()
}

draw_player :: proc() {
	origin := rl.Vector2{player_sprite_width * 0.5, player_sprite_height * 0.5}
	rl.DrawTexturePro(gamer_texture, player_source, player_destination, origin, 0, rl.WHITE)
}
