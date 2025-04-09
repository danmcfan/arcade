export type Sprite = {
  image: HTMLImageElement;
  width: number;
  height: number;
  rowIndex: number;
  colIndex: number;
  animationFrames: number;
  cyclesPerSecond: number;
};

export enum SpriteID {
  CURSOR = "cursor",
  PLAYER_IDLE_DOWN = "player_idle_down",
  PLAYER_IDLE_RIGHT = "player_idle_right",
  PLAYER_IDLE_UP = "player_idle_up",
  PLAYER_WALK_DOWN = "player_walk_down",
  PLAYER_WALK_RIGHT = "player_walk_right",
  PLAYER_WALK_UP = "player_walk_up",
  PLAYER_JUMP_DOWN = "player_jump_down",
  PLAYER_JUMP_RIGHT = "player_jump_right",
  PLAYER_JUMP_UP = "player_jump_up",
  PLAYER_ATTACK_DOWN = "player_attack_down",
  PLAYER_ATTACK_RIGHT = "player_attack_right",
  PLAYER_ATTACK_UP = "player_attack_up",
  PLAYER_ROLL_DOWN = "player_roll_down",
  PLAYER_ROLL_RIGHT = "player_roll_right",
  PLAYER_ROLL_UP = "player_roll_up",
  SWORD_ATTACK_DOWN = "sword_attack_down",
  SWORD_ATTACK_RIGHT = "sword_attack_right",
  SWORD_ATTACK_UP = "sword_attack_up",
  GRASS_MIDDLE = "grass_middle",
  GRASS_1 = "grass_1",
  GRASS_2 = "grass_2",
  GRASS_3 = "grass_3",
  CHICKEN_IDLE = "chicken_idle",
  CHICKEN_WALK = "chicken_walk",
  CHICKEN_EAT = "chicken_eat",
  SKELETON_IDLE_DOWN = "skeleton_idle_down",
  SKELETON_IDLE_RIGHT = "skeleton_idle_right",
  SKELETON_IDLE_UP = "skeleton_idle_up",
  SKELETON_WALK_DOWN = "skeleton_walk_down",
  SKELETON_WALK_RIGHT = "skeleton_walk_right",
  SKELETON_WALK_UP = "skeleton_walk_up",
  SKELETON_DAMAGE_DOWN = "skeleton_damage_down",
  SKELETON_DAMAGE_RIGHT = "skeleton_damage_right",
  SKELETON_DAMAGE_UP = "skeleton_damage_up",
  SKELETON_DEAD = "skeleton_dead",
  DEMON_IDLE_DOWN = "demon_idle_down",
}

export function getSprite(
  sprites: Map<SpriteID, Sprite>,
  id: SpriteID
): Sprite {
  return sprites.get(id) as Sprite;
}

export function getSprites(): Map<SpriteID, Sprite> {
  const cursorImage = getImage("/images/ui/UI_Icons.png");
  const playerImage = getImage("/images/player/Player.png");
  const playerJumpImage = getImage("/images/player/Player_Jump.png");
  const playerAttackImage = getImage("/images/player/Player_Attack.png");
  const playerRollImage = getImage("/images/player/Player_Roll.png");
  const ironSwordImage = getImage("/images/player/Iron_Sword.png");
  const grassMiddleImage = getImage("/images/tiles/Grass_Middle.png");
  const grass1Image = getImage("/images/outdoor/Grass_1_Anim.png");
  const grass2Image = getImage("/images/outdoor/Grass_2_Anim.png");
  const grass3Image = getImage("/images/outdoor/Grass_3_Anim.png");
  const chickenImage = getImage("/images/animals/Chicken_01.png");
  const skeletonImage = getImage("/images/enemies/Skeleton_Swordman.png");
  const demonImage = getImage("/images/enemies/Demon_Idle.png");

  return new Map([
    [
      SpriteID.CURSOR,
      {
        image: cursorImage,
        width: 16,
        height: 16,
        rowIndex: 0,
        colIndex: 5,
        animationFrames: 1,
        cyclesPerSecond: 1,
      },
    ],
    [
      SpriteID.PLAYER_IDLE_DOWN,
      {
        image: playerImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.PLAYER_IDLE_RIGHT,
      {
        image: playerImage,
        width: 32,
        height: 32,
        rowIndex: 1,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.PLAYER_IDLE_UP,
      {
        image: playerImage,
        width: 32,
        height: 32,
        rowIndex: 2,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.PLAYER_WALK_DOWN,
      {
        image: playerImage,
        width: 32,
        height: 32,
        rowIndex: 3,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.PLAYER_WALK_RIGHT,
      {
        image: playerImage,
        width: 32,
        height: 32,
        rowIndex: 4,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.PLAYER_WALK_UP,
      {
        image: playerImage,
        width: 32,
        height: 32,
        rowIndex: 5,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.PLAYER_JUMP_DOWN,
      {
        image: playerJumpImage,
        width: 64,
        height: 64,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 3,
      },
    ],
    [
      SpriteID.PLAYER_JUMP_RIGHT,
      {
        image: playerJumpImage,
        width: 64,
        height: 64,
        rowIndex: 1,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 3,
      },
    ],
    [
      SpriteID.PLAYER_JUMP_UP,
      {
        image: playerJumpImage,
        width: 64,
        height: 64,
        rowIndex: 2,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 3,
      },
    ],
    [
      SpriteID.PLAYER_ATTACK_DOWN,
      {
        image: playerAttackImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 4,
        cyclesPerSecond: 3,
        frameHold: 5,
      },
    ],
    [
      SpriteID.PLAYER_ATTACK_RIGHT,
      {
        image: playerAttackImage,
        width: 32,
        height: 32,
        rowIndex: 3,
        colIndex: 0,
        animationFrames: 4,
        cyclesPerSecond: 3,
      },
    ],
    [
      SpriteID.PLAYER_ATTACK_UP,
      {
        image: playerAttackImage,
        width: 32,
        height: 32,
        rowIndex: 6,
        colIndex: 0,
        animationFrames: 4,
        cyclesPerSecond: 3,
      },
    ],
    [
      SpriteID.PLAYER_ROLL_DOWN,
      {
        image: playerRollImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 8,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.PLAYER_ROLL_RIGHT,
      {
        image: playerRollImage,
        width: 32,
        height: 32,
        rowIndex: 2,
        colIndex: 0,
        animationFrames: 8,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.PLAYER_ROLL_UP,
      {
        image: playerRollImage,
        width: 32,
        height: 32,
        rowIndex: 1,
        colIndex: 0,
        animationFrames: 8,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.SWORD_ATTACK_DOWN,
      {
        image: ironSwordImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 4,
        cyclesPerSecond: 3,
      },
    ],
    [
      SpriteID.SWORD_ATTACK_RIGHT,
      {
        image: ironSwordImage,
        width: 32,
        height: 32,
        rowIndex: 3,
        colIndex: 0,
        animationFrames: 4,
        cyclesPerSecond: 3,
      },
    ],
    [
      SpriteID.SWORD_ATTACK_UP,
      {
        image: ironSwordImage,
        width: 32,
        height: 32,
        rowIndex: 6,
        colIndex: 0,
        animationFrames: 4,
        cyclesPerSecond: 3,
      },
    ],
    [
      SpriteID.GRASS_MIDDLE,
      {
        image: grassMiddleImage,
        width: 16,
        height: 16,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 1,
        cyclesPerSecond: 1,
      },
    ],
    [
      SpriteID.GRASS_1,
      {
        image: grass1Image,
        width: 16,
        height: 16,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 8,
        cyclesPerSecond: 1,
      },
    ],
    [
      SpriteID.GRASS_2,
      {
        image: grass2Image,
        width: 16,
        height: 16,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 8,
        cyclesPerSecond: 1,
      },
    ],
    [
      SpriteID.GRASS_3,
      {
        image: grass3Image,
        width: 16,
        height: 16,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 8,
        cyclesPerSecond: 1,
      },
    ],
    [
      SpriteID.CHICKEN_IDLE,
      {
        image: chickenImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 2,
        cyclesPerSecond: 1,
      },
    ],
    [
      SpriteID.CHICKEN_WALK,
      {
        image: chickenImage,
        width: 32,
        height: 32,
        rowIndex: 1,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 1,
      },
    ],
    [
      SpriteID.CHICKEN_EAT,
      {
        image: chickenImage,
        width: 32,
        height: 32,
        rowIndex: 2,
        colIndex: 0,
        animationFrames: 8,
        cyclesPerSecond: 1,
      },
    ],
    [
      SpriteID.SKELETON_IDLE_DOWN,
      {
        image: skeletonImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.SKELETON_IDLE_RIGHT,
      {
        image: skeletonImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.SKELETON_IDLE_UP,
      {
        image: skeletonImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.SKELETON_WALK_DOWN,
      {
        image: skeletonImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.SKELETON_WALK_RIGHT,
      {
        image: skeletonImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.SKELETON_WALK_UP,
      {
        image: skeletonImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
    [
      SpriteID.SKELETON_DAMAGE_DOWN,
      {
        image: skeletonImage,
        width: 32,
        height: 32,
        rowIndex: 13,
        colIndex: 0,
        animationFrames: 4,
        cyclesPerSecond: 3,
      },
    ],
    [
      SpriteID.SKELETON_DAMAGE_RIGHT,
      {
        image: skeletonImage,
        width: 32,
        height: 32,
        rowIndex: 14,
        colIndex: 0,
        animationFrames: 4,
        cyclesPerSecond: 3,
      },
    ],
    [
      SpriteID.SKELETON_DAMAGE_UP,
      {
        image: skeletonImage,
        width: 32,
        height: 32,
        rowIndex: 15,
        colIndex: 0,
        animationFrames: 4,
        cyclesPerSecond: 3,
      },
    ],
    [
      SpriteID.SKELETON_DEAD,
      {
        image: skeletonImage,
        width: 32,
        height: 32,
        rowIndex: 6,
        colIndex: 0,
        animationFrames: 4,
        cyclesPerSecond: 1,
      },
    ],
    [
      SpriteID.DEMON_IDLE_DOWN,
      {
        image: demonImage,
        width: 32,
        height: 32,
        rowIndex: 0,
        colIndex: 0,
        animationFrames: 6,
        cyclesPerSecond: 2,
      },
    ],
  ]);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
  frame: number,
  scale: number,
  flipX: boolean = false
) {
  const frameIndex = Math.floor(frame);
  if (flipX) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(
      sprite.image,
      sprite.width * (sprite.colIndex + frameIndex),
      sprite.height * sprite.rowIndex,
      sprite.width,
      sprite.height,
      -x - sprite.width * scale,
      y,
      sprite.width * scale,
      sprite.height * scale
    );
    ctx.restore();
  } else {
    ctx.drawImage(
      sprite.image,
      sprite.width * (sprite.colIndex + frameIndex),
      sprite.height * sprite.rowIndex,
      sprite.width,
      sprite.height,
      x,
      y,
      sprite.width * scale,
      sprite.height * scale
    );
  }
}

function getImage(path: string): HTMLImageElement {
  const image = new Image();
  image.src = path;
  return image;
}
