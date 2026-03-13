class AudioManager {
  constructor(assetLoader) {
    this.ctx = assetLoader.audioContext;
    this.buffers = assetLoader.audioBuffers;
    this.musicSource = null;
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
    this.musicStartOffset = 0;
    this.musicStartTime = 0;
    this.musicPlaying = false;
  }

  playMusic() {
    if (this.musicPlaying) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.buffers.music;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicSource.start(0, this.musicStartOffset);
    this.musicStartTime = this.ctx.currentTime;
    this.musicPlaying = true;
  }

  pauseMusic() {
    if (!this.musicPlaying) return;
    this.musicStartOffset += this.ctx.currentTime - this.musicStartTime;
    this.musicSource.stop();
    this.musicSource.disconnect();
    this.musicSource = null;
    this.musicPlaying = false;
  }

  toggleMusic(paused) {
    if (paused) {
      this.pauseMusic();
    } else {
      this.playMusic();
    }
  }

  stopMusic() {
    if (this.musicSource) {
      this.musicSource.stop();
      this.musicSource.disconnect();
      this.musicSource = null;
    }
    this.musicStartOffset = 0;
    this.musicPlaying = false;
  }

  playSfx(name) {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const buffer = this.buffers[name];
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.sfxGain);
    source.start();
  }
}

export default AudioManager;
