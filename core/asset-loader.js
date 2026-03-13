const ASSETS = {
  gfx: {
    bg: "assets/gfx/bg.png",
    sprites: "assets/gfx/sprites.png",
  },
  sfx: {
    music: "assets/sfx/music.mp3",
    jump: "assets/sfx/jump.wav",
    spinjump: "assets/sfx/spinjump.wav",
    switch: "assets/sfx/switch.wav",
    correct: "assets/sfx/correct.wav",
    wrong: "assets/sfx/wrong.wav",
    win: "assets/sfx/win.mp3",
    shrink: "assets/sfx/shrink.wav",
    dead: "assets/sfx/dead.wav",
  },
};

class AssetLoader {
  constructor() {
    this.images = {};
    this.audioBuffers = {};
    this.audioContext = new AudioContext();
  }

  async load() {
    const imagePromises = Object.entries(ASSETS.gfx).map(([key, src]) =>
      this._loadImage(key, src)
    );
    const audioPromises = Object.entries(ASSETS.sfx).map(([key, src]) =>
      this._loadAudio(key, src)
    );
    await Promise.all([...imagePromises, ...audioPromises]);
  }

  _loadImage(key, src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images[key] = img;
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  async _loadAudio(key, src) {
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffers[key] = await this.audioContext.decodeAudioData(arrayBuffer);
  }

  getImage(key) {
    return this.images[key];
  }

  getAudioBuffer(key) {
    return this.audioBuffers[key];
  }
}

export default AssetLoader;
