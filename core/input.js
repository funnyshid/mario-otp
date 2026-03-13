class Input {
  constructor(game) {
    this.game = game;
    this.inputDown = {
      up: false,
      down: false,
      left: false,
      right: false,
      b: false,
      a: false,
      x: false,
      y: false,
      l: false,
        r: false,
      start: false,
      select: false,
    };
    this.inputPressed = {};

    // Physical key, controller button
    const keyMap = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      z: "b",
      Z: "b",
      x: "a",
      X: "a",
      a: "y",
      A: "y",
      s: "x",
      S: "x",
      d: "l",
      D: "l",
      c: "r",
      C: "r",
      Enter: "start",
      Shift: "select",
    };

    window.addEventListener("keydown", (e) => {
      e.preventDefault();
      const key = keyMap[e.key];
      if (key) {
        if (!this.inputDown[key]) {
          this.inputPressed[key] = true;
          this.inputDown[key] = true;
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      e.preventDefault();
      const key = keyMap[e.key];
      if (key) {
        this.inputDown[key] = false;
      }
    });
  }

  update() {
    for (const key in this.inputPressed) {
      if (this.inputPressed.hasOwnProperty(key)) {
        this.inputPressed[key] = false;
      }
    }
  }
}

export default Input;