class Entity {
  constructor(x, y, width = 16, height = 16, color = "#ff0ff", game) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.xStart = x;
    this.yStart = y;
    this.dx = 0;
    this.dy = 0;
    this.width = width;
    this.height = height;
    this.depth = 0;
    this.active = true;
    this.visible = true;
    this.color = color;
  }

  update() {
  }

  updatePosition() {
    this.x += this.dx / 16;
    this.y += this.dy / 16;
  }

  draw(ctx) {
    if (!this.visible) return;
    ctx.fillStyle = this.color;
    ctx.fillRect(
      Math.floor(this.x),
      Math.floor(this.y),
      this.width,
      this.height
    );
  }

  
}

export { Entity };
export default Entity;

class Hitbox {
  constructor(xOffset, yOffset, width, height) {
    this.xOffset = xOffset;
    this.yOffset = yOffset;
    this.width = width;
    this.height = height;
  }

  setDimensions(xOffset, yOffset, width, height) {
    this.xOffset = xOffset;
    this.yOffset = yOffset;
    this.width = width;
    this.height = height;
  }

  debugDraw(ctx, entityX, entityY) {
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 1;
    const drawX = Math.floor(entityX + this.xOffset) + 0.5;
    const drawY = Math.floor(entityY + this.yOffset) + 0.5;

    ctx.strokeRect(drawX, drawY, this.width, this.height);
  }
}

export { Hitbox };