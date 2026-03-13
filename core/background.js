class Background {
  constructor(game, image) {
    this.game = game;
    this.image = image;
  }

  draw(ctx) {
    ctx.drawImage(this.image, 0, 0);
  }
}

export default Background;