import Tilemap from "./tilemap.js";
import Input from "./input.js";
import Background from "./background.js";
import Player from "./entities/player.js";
import { Roulette } from "./entities/roulette.js";
import SpriteDrawer from "./sprite.js";
import AssetLoader from "./asset-loader.js";
import AudioManager from "./audio-manager.js";
import { PLAYER_STATES } from "./entities/player.js";

class Game {
  constructor(inputElement) {
    this.inputElement = inputElement;
    this.gameContainer = document.getElementById("game-container");
    this.canvas = document.createElement("canvas");
    this.canvas.width = 256;
    this.canvas.height = 224;
    this.gameContainer.innerHTML = "Loading...";
    // this.gameContainer.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d");

    

    this.input = new Input(this);
    this.currentOtpInput = 0;
    this.otpComplete = false;

    console.log("Loading assets...");
    this.assetLoader = new AssetLoader();
    this.assetLoader.load().then(() => this._init());
  }

  _init() {
    this.gameContainer.innerHTML = "";
    this.gameContainer.appendChild(this.canvas);
    this.debugElement = document.createElement("div");
    this.debugElement.id = "debug-info";
    this.debugText = "";
    this.gameContainer.appendChild(this.debugElement);
    this.audioManager = new AudioManager(this.assetLoader);

    const bgImage = this.assetLoader.getImage("bg");
    const spritesImage = this.assetLoader.getImage("sprites");

    this.background = new Background(this, bgImage);
    this.tilemap = new Tilemap(this);
    this.roulette = new Roulette(this);
    this.player = new Player(24, 55, this);
    this.spriteDrawer = new SpriteDrawer(this.ctx, spritesImage);

    this.frame = 0;
    this.frameAdvance = false;
    this.paused = false;

    this.debugMode = false;

    this.lastTime = performance.now();

    this.fixedDeltaTime = 1000 / 60;
    this.accumulator = 0;
    this.fps = 0;
    this.fpsSampleFrames = 0;
    this.fpsSampleElapsedMs = 0;

    this.setupPause();
    this.audioManager.playMusic();

    console.log("Game loaded");

    requestAnimationFrame((time) => this.loop(time));
  }

  loop(currentTime) {
    // first frame shits itself if this isnt here
    if (!this.lastTime) this.lastTime = currentTime;

    let frameTime = (currentTime - this.lastTime);
    this.lastTime = currentTime;

    // Calculate FPS using a 1-second sample window
    if (frameTime > 0) {
      this.fpsSampleFrames += 1;
      this.fpsSampleElapsedMs += frameTime;

      if (this.fpsSampleElapsedMs >= 1000) {
        this.fps = (this.fpsSampleFrames * 1000) / this.fpsSampleElapsedMs;
        this.fpsSampleFrames = 0;
        this.fpsSampleElapsedMs = 0;
      }
    }

    if (frameTime > 250) frameTime = 250; // Cap to avoid freezing if the tab was inactive
    this.accumulator += frameTime;

    if (!this.paused || this.frameAdvance) {
      // use fixed 60 fps timestep
      while (this.accumulator >= this.fixedDeltaTime) {
        this.roulette.update();
        this.player.update();
        this.input.update();
        this.frame = (this.frame + 1) % 256;

        this.accumulator -= this.fixedDeltaTime;

        if (this.frameAdvance) {
          this.frameAdvance = false;
          this.accumulator = 0;
          break;
        }
      }
    } else {
      this.accumulator = 0;
    }

    // Render
    this.background.draw(this.ctx);
    if (this.debugMode) {
      this.tilemap.debugDraw(this.ctx);
    }
    this.roulette.draw(this.ctx);
    this.player.draw(this.ctx);
    if (this.debugMode) {
      this.updateDebugInfo();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  addCharacterToInputDisplay(char) {
    const maxLength = 6;
    if ((this.currentOtpInput || "").length >= maxLength) return;
    this.currentOtpInput = (this.currentOtpInput || "") + char;
    this.updateInputDisplay();
}

removeCharacterFromInputDisplay() {
    this.currentOtpInput = (this.currentOtpInput || "").slice(0, -1);
    this.updateInputDisplay();
}

wrongOtpEntered() {
  if (this.player.playerState !== PLAYER_STATES.NORMAL) return;
    this.audioManager.playSfx("wrong");
    this.player.hurt();
}

correctOtpEntered() {
  if (this.player.playerState !== PLAYER_STATES.NORMAL) return;
    this.otpComplete = true;
    this.audioManager.playSfx("correct");
    this.audioManager.stopMusic();
    this.audioManager.playSfx("win");
    this.player.win();
    this.roulette.stop();
}

updateInputDisplay() {
    const digits = this.currentOtpInput.replace(/\D/g, "").slice(0, 6);
    // put into correct input boxes
    for (let i = 0; i < 6; i++) {
        const inputBox = document.getElementById(`input-box-${i + 1}`);
        inputBox.innerText = digits[i] || "";
    }

    console.log("Current OTP input:", this.currentOtpInput);
}

  setupPause() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "0") {
        this.debugMode = !this.debugMode;
        if (!this.debugMode) {
          this.debugElement.innerText = "";
          if (this.paused) {
            this.paused = false;
            this.audioManager.toggleMusic(false);
          }
        }
        console.log("Debug mode:", this.debugMode);
      }
      if (!this.debugMode) return;
      if (e.key === "Enter") {
        this.paused = !this.paused;
        this.audioManager.toggleMusic(this.paused);
        console.log("Paused:", this.paused);
      } else if (e.key === "k") {
        if (!this.paused) {
          this.paused = true;
          this.audioManager.toggleMusic(true);
        } else {
          this.frameAdvance = true;
        }
      }
    });
  }

  updateDebugInfo() {
    this.debugText += `\nFrame: ${this.frame}\nFPS: ${this.fps.toFixed(2)}`;
    this.debugElement.innerText = this.debugText;
  }
}

export default Game;
