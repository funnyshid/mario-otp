import { Entity, Hitbox } from "./entity.js";

const spawnPosition = { x: 128, y: 96 };
const ROULETTE_CONFIG = {
	radius: 48,
	initialSpeed: 0.02,
	maxSpeed: 0.04,
	speedIncrement: 1.1,
};
const BLOCK_BOUNCE_CONFIG = {
  bounceDuration: 20,
  bounceGravity: 0.2,
  bounceInitialVelocity: -2,
};
const ROULETTE_SPRITE_CONFIG = {
  tileSize: 16,
  rowIndex: 4,
  backspaceIndex: 10,
};

class Roulette extends Entity {
  constructor(game) {
    super(spawnPosition.x, spawnPosition.y, 16, 16, "#ff00bb", game);
    this.items = Array.from(
      { length: 11 },
      (_, i) => new RouletteItem(spawnPosition.x, spawnPosition.y, i, game, this)
    );
    this.speed = ROULETTE_CONFIG.initialSpeed;
    this.angle = 0;
    this.stopped = false;

    // if key 0, reverse direction and speed up
    window.addEventListener("keydown", (e) => {
      if (e.key === "0") {
        this.increaseSpeed();
      }
    });
  }

  update() {
    if (this.stopped) return;
    this.angle += this.speed;
    this.items.forEach((item, index) => {
      const itemAngle = this.angle + (index / this.items.length) * 2 * Math.PI;
      item.x = this.x + Math.cos(itemAngle) * ROULETTE_CONFIG.radius;
      item.y = this.y + Math.sin(itemAngle) * ROULETTE_CONFIG.radius;
      item.update();
    });
  }

  stop() {
    this.stopped = true;
  }

  resume() {
    this.stopped = false;
  }

  draw(ctx) {
    // draw each item
    this.items.forEach((item) => item.draw(ctx));
  }

	increaseSpeed() {
		this.speed *= ROULETTE_CONFIG.speedIncrement;
		if (this.speed > ROULETTE_CONFIG.maxSpeed) this.speed = ROULETTE_CONFIG.maxSpeed;
	}
}

class RouletteItem extends Entity {
  constructor(x, y, index, game, parent) {
    super(x, y, 16, 16, "rgb(19, 63, 63)", game);
		this.parent = parent;
    this.index = index;
    this.hitbox = new Hitbox(0, 0, 16, 16);
    this.state = "normal"; // "normal" or "bouncing"
    this.bounceTimer = 0;
    this.bounceVelocity = 0;
    this.bounceOffset = 0;
  }

  startBounce() {
    this.state = "bouncing";
		// this.parent.increaseSpeed();
    this.bounceTimer = BLOCK_BOUNCE_CONFIG.bounceDuration;
    this.bounceVelocity = BLOCK_BOUNCE_CONFIG.bounceInitialVelocity;
    this.bounceOffset = 0;
  }

  update() {
    if (this.state === "bouncing") {
      this.bounceOffset += this.bounceVelocity;
      this.bounceVelocity += BLOCK_BOUNCE_CONFIG.bounceGravity;
      this.bounceTimer--;
      if (this.bounceTimer <= 0) {
        this.state = "normal";
        this.bounceOffset = 0;
        this.bounceVelocity = 0;
      }
    }
  }

  draw(ctx) {
    if (!this.visible) return;
    const drawY = this.y + this.bounceOffset;
    const spriteDrawer = this.game.spriteDrawer;
    const tileSize = ROULETTE_SPRITE_CONFIG.tileSize;
    const frameIndex =
      this.index === ROULETTE_SPRITE_CONFIG.backspaceIndex
        ? ROULETTE_SPRITE_CONFIG.backspaceIndex
        : this.index;
    spriteDrawer.drawSprite({
      sx: frameIndex * tileSize,
      sy: ROULETTE_SPRITE_CONFIG.rowIndex * tileSize,
      sWidth: tileSize,
      sHeight: tileSize,
      dx: Math.floor(this.x),
      dy: Math.floor(drawY),
      flipX: false,
      flipY: false,
      scale: 1
    });
    // ctx.fillStyle = this.color;
    // // draw 16x16 square with index number in the center
    // ctx.fillRect(
    //   Math.floor(this.x),
    //   Math.floor(drawY),
    //   this.width,
    //   this.height,
    // );

    // ctx.fillStyle = "#ffffff";
    // ctx.font = "8px Arial";
    // ctx.textAlign = "center";
    // ctx.textBaseline = "middle";
    // const text = this.index === 10 ? "<" : this.index;
    // ctx.fillText(
    //   text,
    //   Math.floor(this.x + this.width / 2),
    //   Math.floor(drawY + this.height / 2),
    // );

    // Debug hitbox
    // this.hitbox.debugDraw(ctx, this.x, drawY);
  }
}

export { Roulette, RouletteItem };
