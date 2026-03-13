class Tilemap {
  static TILE_SIZE = 16;
  static TILE_COLORS = {
    solid: ["#989898", "#C0C0C0"],
  };
  constructor(game) {
    this.game = game;
    this.tileDataWidth = 16;
    this.tileDataHeight = 14;
    this.tileData = [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1,
      1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ];
    this.initalizeUserDraw();
  }

  initalizeUserDraw() {
    let isDrawing = false;
    let drawMode = null; // "draw" or "erase"

    const getMousePos = (e) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const scaleX = this.game.canvas.width / rect.width;
      const scaleY = this.game.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      return { x, y };
    };

    const drawOrErase = (e) => {
      const { x, y } = getMousePos(e);
      const tileValue = this.getTileAtPixel(x, y);
      if (tileValue !== null) {
        if (drawMode === "draw") {
          this.setTileAtPixel(x, y, 1);
        } else if (drawMode === "erase") {
          this.setTileAtPixel(x, y, 0);
        }
      }
    };

    this.game.canvas.addEventListener("mousedown", (e) => {
      if (!this.game.debugMode) return;
      isDrawing = true;
      const { x, y } = getMousePos(e);
      const tileValue = this.getTileAtPixel(x, y);
      if (tileValue !== null) {
        drawMode = tileValue === 1 ? "erase" : "draw";
        drawOrErase(e);
      }
    });

    this.game.canvas.addEventListener("mousemove", (e) => {
      if (!this.game.debugMode) return;
      if (isDrawing) {
        drawOrErase(e);
      }
    });

    this.game.canvas.addEventListener("mouseup", () => {
      if (!this.game.debugMode) return;
      isDrawing = false;
      drawMode = null;
    });

    // right click disable
    this.game.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  debugDraw(ctx) {
    const startCol = 0;
    const endCol = this.tileDataWidth;
    const startRow = 0;
    const endRow = this.tileDataHeight;

    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        if (
          x >= 0 &&
          x < this.tileDataWidth &&
          y >= 0 &&
          y < this.tileDataHeight
        ) {
          const tile = this.tileData[y * this.tileDataWidth + x];
          if (tile === 1) {
            const screenX = x * Tilemap.TILE_SIZE;
            const screenY = y * Tilemap.TILE_SIZE;
            ctx.fillStyle = Tilemap.TILE_COLORS.solid[0];
            ctx.fillRect(
              screenX,
              screenY,
              Tilemap.TILE_SIZE,
              Tilemap.TILE_SIZE,
            );
            ctx.fillStyle = Tilemap.TILE_COLORS.solid[1];
            ctx.fillRect(
              screenX,
              screenY,
              Tilemap.TILE_SIZE / 2,
              Tilemap.TILE_SIZE / 2,
            );
            ctx.fillRect(
              screenX + Tilemap.TILE_SIZE / 2,
              screenY + Tilemap.TILE_SIZE / 2,
              Tilemap.TILE_SIZE / 2,
              Tilemap.TILE_SIZE / 2,
            );
          }
        }
      }
    }
  }

  getTileAtPixel(x, y) {
    const tileX = Math.floor(x / Tilemap.TILE_SIZE);
    const tileY = Math.floor(y / Tilemap.TILE_SIZE);
    const index = tileY * this.tileDataWidth + tileX;
    if (
      tileX < 0 ||
      tileY < 0 ||
      tileX >= this.tileDataWidth ||
      tileY >= this.tileDataHeight
    ) {
      return null; // out of bounds
    }
    return this.tileData[index];
  }

  meetingSolidTileAtPixel(x, y) {
    const tileValue = this.getTileAtPixel(x, y);
    return tileValue === 1;
  }

  setTileAtPixel(x, y, tileId) {
    const tileX = Math.floor(x / Tilemap.TILE_SIZE);
    const tileY = Math.floor(y / Tilemap.TILE_SIZE);
    const index = tileY * this.tileDataWidth + tileX;
    if (
      tileX < 0 ||
      tileY < 0 ||
      tileX >= this.tileDataWidth ||
      tileY >= this.tileDataHeight
    ) {
      return; // out of bounds
    }
    this.tileData[index] = tileId;
  }

  setTileRectangle(cellX, cellY, width, height, tileId) {
    for (let y = cellY; y < cellY + height; y++) {
      for (let x = cellX; x < cellX + width; x++) {
        const index = y * this.tileDataWidth + x;
        if (
          x >= 0 &&
          y >= 0 &&
          x < this.tileDataWidth &&
          y < this.tileDataHeight
        ) {
          this.tileData[index] = tileId;
        }
      }
    }
  }
}

export default Tilemap;
