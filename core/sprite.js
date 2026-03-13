class SpriteDrawer {
  constructor(context, spriteSheet) {
    this.ctx = context?.save ? context : context?.ctx;
    this.spriteSheet = spriteSheet;
  }

  drawSprite(config) {
    const {
      sx, sy,          
      sWidth, sHeight, 
      dx, dy,         
      flipX = false,
      flipY = false,
      scale = 1
    } = config;

    const dWidth = sWidth * scale;
    const dHeight = sHeight * scale;

    if (!this.ctx || !this.spriteSheet) return;

    this.ctx.save(); // Save state to prevent flipping everything else

    this.ctx.translate(dx + dWidth / 2, dy + dHeight / 2);
    this.ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

    this.ctx.drawImage(
      this.spriteSheet,
      sx, sy, sWidth, sHeight,   
      -dWidth / 2, -dHeight / 2,
      dWidth, dHeight           
    );

    this.ctx.restore(); // Restore state for the next draw call
  }
}

export default SpriteDrawer;