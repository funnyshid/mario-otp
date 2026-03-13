import { Entity, Hitbox } from "./entity.js"
import { mod16 } from "../utils/utils.js";

const PLAYER_STATES = {
  NORMAL: "normal",
  WIN: "win",
  SHRINKING: "shrinking",
  DEAD: "dead",
};

const PLAYER_CONFIG = {
  TIMERS: {
    win: 240, // frames for win transition
    winPoseShow: 80,
    shrink: 32, // frames for shrink transition
    dead: 240,
    deathJump: 40, // frames after hit before jump animation
  },
  PHYSICS: {
    // all in 1/16th of a pixel per frame
    vertical: {
      // indexed by player dx every 8 subpixels
      // i.e. if you're doing 20 you jump at index 2, if you're doing 36 you jump at index 4, etc
      normalJumpForces: [-80, -82, -85, -87, -90, -92, -95],
      spinJumpForces: [-74, -76, -78, -80, -82, -85, -87],
      // gravity always applies even when standing on ground.
      // also when you start a jump, gravity will take -3 off your initial jump force immediately
      gravity: 6,
      gravityHoldingJump: 3,
      terminalVelocity: 70,
      terminalVelocityHoldingJump: 67,
      entityBonkVelocity: 16,
      deathJumpForce: -90,
    },
    horizontal: {
      maxWalkSpeed: 20,
      maxRunSpeed: 36,
      maxSprintSpeed: 48,
      timeRunningToReachSprint: 112, // frames
      acceleration: 1.5, // both walk and run
      decelerationNoPlayerInput: 1, // only if neither left nor right is held. does not apply in air
      decelerationSkidding: 2.5, // reversing direction of movement
      decelerationSkiddingRunning: 5, // reverse while holding run button
    },
  },
  // used for tile collision detection and interaction points
  // left and right side points switch sides based on which wall is closer via mod16(x) < 8
  TILE_INTERACTION_POINTS: {
    // offsets from top left of entity bounding box
    head: {
      x: 8,
      y: [16, 8], // small, big
    },
    center: {
      x: 8,
      y: [24, 14], // small, big
    },
    side: {
      upper: {
        x: [3, 13], // left, right
        y: [22, 15], // small, big
      },
      lower: {
        x: [3, 13], // left, right
        y: [26, 26], // small, big
      },
    },
    feet: {
      x: [5, 11], // left, right
      y: 32,
    },
  },
  // used for entity collision detection
  ENTITY_COLLISION_HITBOX: {
    x: 2,
    y: [18, 4], // small, big
    width: 12,
    height: [13, 27], // small, big
  },
  FLOOR_THRESHOLD: 8, // how many pixels into a tile is considered floor to snap player up
  JUMP_BUFFER_WINDOW: 6, // frames after leaving ground that a jump input will still register
  COYOTE_TIME: 8, // frames after leaving ground that player can still jump
};

class Player extends Entity {
  constructor(x, y, game) {
    super(x, y, 16, 32, "rgb(117, 0, 0)", game);
    this.inAir = false;
    this.isBig = true;
    this.isDucking = false;
    this.facingRight = true;
    this.sprintMeter = 0;
    this.spinjumping = false;
    this.sprintJumping = false;
    this.stuckInWall = false;
    this.collisionState = {
      center: false,
      above: false,
      below: false,
      left: false,
      right: false,
    }
    this.hitbox = new Hitbox(
      PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.x,
      PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.y[0],
      PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.width,
      PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.height[0],
    );

    this.acceptInput = true;

    this.playerState = PLAYER_STATES.NORMAL;
    this.transitionTimer = 0;

    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;

    this.animationState = 'stand';
    this.playerAnimationTimer = 0;
    this.animationFrame = 0;
    this.spinJumpBaseFacingRight = true;

    window.addEventListener("keydown", (e) => {
      if (e.key === "2" && this.game.debugMode) {
        this.isBig = !this.isBig;
        console.log("Toggled big:", this.isBig);
      }
    });
  }

  update() {
    const rawInput = this.game.input;
    const noInput = {
      inputDown: { up: false, down: false, left: false, right: false, b: false, a: false, x: false, y: false, l: false, r: false, start: false, select: false },
      inputPressed: {},
    };
    const input = this.acceptInput ? rawInput : noInput;

    if (this.playerState === PLAYER_STATES.WIN) {
      this.handleWin();
    }

    if (this.playerState === PLAYER_STATES.SHRINKING) {
      this.handleShrinking();
      this.updateAnimation(input);
      return;
    }

    if (this.playerState === PLAYER_STATES.DEAD) {
      this.handleDeath();
      return;
    }

    this.updatePosition();
    this.handleCoyoteTime();
    this.checkAndHandleStuckInWall();
    this.handleDucking(input);
    this.handleHorizontalMovement(input);
    this.handleVerticalMovement(input);

    this.handleTileCollision(input);
    this.updateHitbox();
    this.handleRouletteCollision();
    this.updateAnimation(input);
  }

  draw(ctx) {
    // Draw player sprite
    const frameIndex = this.getSpriteFrame();
    const spriteDrawer = this.game.spriteDrawer;

    if (this.isBig) {
      const sWidth = 24;
      const sHeight = 32;
      const xOffset = this.facingRight ? -4 : 4; // big sprites are 24 wide but we want them centered on the same point as small sprites, so offset by 4 pixels
      spriteDrawer.drawSprite({
        sx: frameIndex * sWidth,
        sy: 32,
        sWidth,
        sHeight,
        dx: Math.floor(this.x - 4 + xOffset),
        dy: Math.floor(this.y),
        flipX: this.facingRight,
      });
    } else {
      const sWidth = 16;
      const sHeight = 32;
      spriteDrawer.drawSprite({
        sx: frameIndex * sWidth,
        sy: 0,
        sWidth,
        sHeight,
        dx: Math.floor(this.x),
        dy: Math.floor(this.y),
        flipX: this.facingRight,
      });
    }

    if (this.game.debugMode) {
      this.debugDraw(ctx);
    }
  }

  debugDraw(ctx) {
    this.game.debugText = `X: ${this.x.toFixed(2)}
Y: ${this.y.toFixed(2)}
DX: ${this.dx.toFixed(2)}
DY: ${this.dy.toFixed(2)}
In Air: ${this.inAir}
Spinjumping: ${this.spinjumping}
Stuck in wall: ${this.stuckInWall}
Ducking: ${this.isDucking}
Big: ${this.isBig}
Sprint Meter: ${this.sprintMeter}
Jump Buffer Timer: ${this.jumpBufferTimer}
Coyote Timer: ${this.coyoteTimer}
Facing Right: ${this.facingRight}
Sprint Jumping: ${this.sprintJumping}
Anim State: ${this.animationState}
Anim Frame: ${this.animationFrame}
Transition timer: ${this.transitionTimer}
Collision State: \n  -Above: ${this.collisionState.above}\n  -Below: ${this.collisionState.below}\n  -Left: ${this.collisionState.left}\n  -Right: ${this.collisionState.right} \n -Center: ${this.collisionState.center}
`;

    // draw hitbox
    // this.hitbox.debugDraw(ctx, this.x, this.y);

    // draw collision points
    const tileInteractionPoints = PLAYER_CONFIG.TILE_INTERACTION_POINTS;
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.fillRect(
      Math.floor(this.x),
      Math.floor(this.y),
      1,
      1,
    );

    ctx.fillStyle = "rgb(255, 0, 191)";
    const centerPoints = tileInteractionPoints.center;
    ctx.fillRect(
      Math.floor(this.x + centerPoints.x),
      Math.floor(
        this.y +
          centerPoints.y[this.isBig && !this.isDucking ? 1 : 0],
      ),
      1,
      1,
    );
    ctx.fillStyle = "rgb(0, 234, 255)";
    const headPoints = tileInteractionPoints.head;
    ctx.fillRect(
      Math.floor(this.x + headPoints.x),
      Math.floor(
        this.y + headPoints.y[this.isBig && !this.isDucking ? 1 : 0],
      ),
      1,
      1,
    );
    const feetPoints = tileInteractionPoints.feet;
    ctx.fillRect(
      Math.floor(this.x + feetPoints.x[0]),
      Math.floor(this.y + feetPoints.y),
      1,
      1,
    );
    ctx.fillRect(
      Math.floor(this.x + feetPoints.x[1]),
      Math.floor(this.y + feetPoints.y),
      1,
      1,
    );

    const sidePoints = tileInteractionPoints.side;
    const checkingRightSide = mod16(this.x) < 8;
    const sideIndex = checkingRightSide ? 1 : 0;
    ctx.fillRect(
      Math.floor(this.x + sidePoints.upper.x[sideIndex]),
      Math.floor(
        this.y +
          sidePoints.upper.y[this.isBig && !this.isDucking ? 1 : 0],
      ),
      1,
      1,
    );
    ctx.fillRect(
      Math.floor(this.x + sidePoints.lower.x[sideIndex]),
      Math.floor(
        this.y +
          sidePoints.lower.y[this.isBig && !this.isDucking ? 1 : 0],
      ),
      1,
      1,
    );
  }

  // Player animation state machine and sprite frame selection
  updateAnimation(input) {
    const physics = PLAYER_CONFIG.PHYSICS.horizontal;
    const absDx = Math.abs(this.dx);
    const isSprinting = this.sprintMeter === physics.timeRunningToReachSprint;

    let newState;

    if (this.spinjumping && this.inAir) {
      newState = 'spinJump';
    } else if (this.isDucking && this.inAir) {
      newState = 'duck';
    } else if (this.inAir && this.dy < 0) {
      newState = 'jump';
    } else if (this.inAir) {
      newState = 'fall';
    } else if (this.isDucking) {
      newState = 'duck';
    } else if (this.isSkidding(input)) {
      newState = 'skid';
    } else if (absDx === 0 && input.inputDown.up) {
      newState = 'lookUp';
    } else if (absDx === 0) {
      newState = 'stand';
    } else if (isSprinting) {
      newState = 'sprint';
    } else if (input.inputDown.x && absDx > physics.maxWalkSpeed) {
      newState = 'run';
    } else {
      newState = 'walk';
    }

    if (newState !== this.animationState) {
      const seamless =
        (newState === 'walk' && this.animationState === 'run') ||
        (newState === 'run' && this.animationState === 'walk');
      if (!seamless) {
        this.playerAnimationTimer = 0;
        this.animationFrame = 0;
      }
      if (newState === 'spinJump') {
        this.spinJumpBaseFacingRight = this.facingRight;
      }
      this.animationState = newState;
    }

    switch (this.animationState) {
      case 'walk': {
        this.playerAnimationTimer++;
        const walingSlow = absDx <= physics.maxWalkSpeed/2;
        const walkAnimSpeed = walingSlow ? 12 : 5;
        if (this.playerAnimationTimer >= walkAnimSpeed) {
          this.playerAnimationTimer = 0;
          this.animationFrame++;
        }
        break;
      }
      case 'run': {
        this.playerAnimationTimer++;
        if (this.playerAnimationTimer >= 3) {
          this.playerAnimationTimer = 0;
          this.animationFrame++;
        }
        break;
      }
      case 'sprint': {
        this.playerAnimationTimer++;
        if (this.playerAnimationTimer >= 2) {
          this.playerAnimationTimer = 0;
          this.animationFrame++;
        }
        break;
      }
      case 'spinJump': {
        this.playerAnimationTimer++;
        if (this.playerAnimationTimer >= 2) {
          this.playerAnimationTimer = 0;
          this.animationFrame++;
        }
        break;
      }
    }

    if (this.animationState === 'spinJump') {
      const spinPhase = Math.floor((this.animationFrame % 4) / 2);
      this.facingRight =
        spinPhase === 0
          ? this.spinJumpBaseFacingRight
          : !this.spinJumpBaseFacingRight;
    }
  }

  isSkidding(input) {
    if (this.inAir || this.isDucking) return false;
    const inputDir = input.inputDown.right - input.inputDown.left;
    if (inputDir === 0) return false;
    return (this.dx > 0 && inputDir < 0) || (this.dx < 0 && inputDir > 0);
  }

  getSpriteFrame() {
    return this.isBig ? this.getBigSpriteFrame() : this.getSmallSpriteFrame();
  }

  getSmallSpriteFrame() {
    const walkFrames = [0, 1];
    const sprintFrames = [2, 3];
    const spinJumpFrames = [0, 6, 0, 11];

    // small win is 12
    // big win is 14
    const standOrWinPose = (this.playerState === PLAYER_STATES.WIN && this.transitionTimer <= PLAYER_CONFIG.TIMERS.winPoseShow) ? 12 : 0;

    switch (this.animationState) {
      case 'stand': return standOrWinPose;
      case 'walk':
      case 'run': return walkFrames[this.animationFrame % walkFrames.length];
      case 'sprint': return sprintFrames[this.animationFrame % sprintFrames.length];
      case 'jump':
      case 'fall':
        if (this.sprintJumping) return 10; // sprint jump/fall pose
        return this.animationState === 'jump' ? 4 : 5;
      case 'spinJump': return spinJumpFrames[this.animationFrame % spinJumpFrames.length];
      case 'skid': return 7;
      case 'lookUp': return 8;
      case 'duck': return 9;
      case 'death': return 13;
      default: return 0;
    }
  }

  getBigSpriteFrame() {
    const walkFrames = [0, 1, 2, 1];
    const sprintFrames = [3, 4, 5];
    const spinJumpFrames = [0, 9, 0, 13];
    const standOrWinPose = (this.playerState === PLAYER_STATES.WIN && this.transitionTimer <= PLAYER_CONFIG.TIMERS.winPoseShow) ? 14 : 0;

    switch (this.animationState) {
      case 'stand': return standOrWinPose;
      case 'walk':
      case 'run': return walkFrames[this.animationFrame % walkFrames.length];
      case 'sprint': return sprintFrames[this.animationFrame % sprintFrames.length];
      case 'jump': return this.sprintJumping ? 8 : 6;
      case 'fall': return this.sprintJumping ? 8 : 7;
      case 'spinJump': return spinJumpFrames[this.animationFrame % spinJumpFrames.length];
      case 'skid': return 10;
      case 'lookUp': return 11;
      case 'duck': return 12;
      default: return 0;
    }
  }

  win() {
    this.playerState = PLAYER_STATES.WIN;
    this.transitionTimer = PLAYER_CONFIG.TIMERS.win;
    this.acceptInput = false;
  }

  handleWin() {
    if (this.transitionTimer > 0) {
      this.transitionTimer--;
    } else if (this.transitionTimer === 0) {
      this.transitionTimer = -1;
      location.reload();
    }
  }

  hurt() {
    if (this.playerState !== PLAYER_STATES.NORMAL) return;

    if (this.isBig) {
      this.playerState = PLAYER_STATES.SHRINKING;
      this.transitionTimer = PLAYER_CONFIG.TIMERS.shrink;
      this.acceptInput = false;
      this.game.roulette.stop();
      this.game.audioManager.playSfx("shrink");
    } else {
      this.playerState = PLAYER_STATES.DEAD;
      this.transitionTimer = PLAYER_CONFIG.TIMERS.dead;
      this.acceptInput = false;
      this.dx = 0;
      this.dy = 0;
      this.isBig = false;
      this.animationState = 'death';
      this.game.audioManager.stopMusic();
      this.game.audioManager.playSfx("dead");
      this.game.roulette.stop();
    }
  }

  handleShrinking() {
    this.transitionTimer--;
    if (this.transitionTimer % 4 === 0) {
      this.isBig = !this.isBig;
    }
    if (this.transitionTimer <= 0) {
      this.isBig = false;
      this.playerState = PLAYER_STATES.NORMAL;
      this.acceptInput = true;
      this.game.roulette.resume();
    }
  }

  handleDeath() {
    if (this.transitionTimer < 0) return;
    this.transitionTimer--;
    const deathJumpStart = PLAYER_CONFIG.TIMERS.dead - PLAYER_CONFIG.TIMERS.deathJump;

    if (this.transitionTimer === deathJumpStart) {
      this.dy = PLAYER_CONFIG.PHYSICS.vertical.deathJumpForce;
    }

    if (this.transitionTimer <= deathJumpStart) {
      // Phase 2: vertical physics only
      this.dy += PLAYER_CONFIG.PHYSICS.vertical.gravity;
      if (this.dy > PLAYER_CONFIG.PHYSICS.vertical.terminalVelocity) {
        this.dy = PLAYER_CONFIG.PHYSICS.vertical.terminalVelocity;
      }
      this.y += this.dy / 16;

      if (this.transitionTimer % 4 === 0) {
        this.facingRight = !this.facingRight;
      }
    }

    if (this.transitionTimer <= 0) {
      this.transitionTimer = -1;
      location.reload();
    }
  }

  checkAndHandleStuckInWall() {
    this.stuckInWall = this.lowClearance() && !this.inAir;
    this.collisionState.center = this.lowClearance();
    if (this.stuckInWall) {
      this.dx = 0;
      this.x--;
    }
  }

  handleDucking(input) {
    if (!this.inAir) {
      this.isDucking = input.inputDown.down;
    }
  }

  updateHitbox() {
    if (this.isBig && !this.isDucking) {
      this.hitbox.setDimensions(
        PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.x,
        PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.y[1],
        PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.width,
        PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.height[1],
      );
    } else {
      this.hitbox.setDimensions(
        PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.x,
        PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.y[0],
        PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.width,
        PLAYER_CONFIG.ENTITY_COLLISION_HITBOX.height[0],
      );
    }
  }

  imposeGravity(input) {
    const physics = PLAYER_CONFIG.PHYSICS.vertical;
    const terminalVelocity =
      input.inputDown.b || input.inputDown.a
        ? physics.terminalVelocityHoldingJump
        : physics.terminalVelocity;
    const gravity =
      input.inputDown.b || input.inputDown.a
        ? physics.gravityHoldingJump
        : physics.gravity;
    this.dy += gravity;
    if (this.dy > terminalVelocity) {
      this.dy = terminalVelocity;
    }
  }

  lowClearance() {
    const tileInteractionPoints = PLAYER_CONFIG.TILE_INTERACTION_POINTS;
    const centerPoints = tileInteractionPoints.center;
    const centerSolid = this.game.tilemap.meetingSolidTileAtPixel(
      this.x + centerPoints.x,
      this.y + centerPoints.y[this.isBig && !this.isDucking ? 1 : 0],
    );
    return centerSolid;
  }

  // handle when player is allowed to sprint and recharge sprint meter
  handleSprintMeter(input, inputtingDirection) {
    const timeRunningToReachSprint =
      PLAYER_CONFIG.PHYSICS.horizontal.timeRunningToReachSprint;

    const isMovingFast =
      Math.abs(this.dx) >= PLAYER_CONFIG.PHYSICS.horizontal.maxRunSpeed;
    const isInputting = inputtingDirection && input.inputDown.x;
    const canSprint =
      isMovingFast && isInputting && (this.sprintJumping || !this.inAir);

    if (canSprint) {
      this.sprintMeter = Math.min(
        this.sprintMeter + 2,
        timeRunningToReachSprint,
      );
    } else if (this.sprintMeter > 0) {
      this.sprintMeter--;
    }
  }

  handleCoyoteTime() {
    if (!this.inAir) {
      this.coyoteTimer = PLAYER_CONFIG.COYOTE_TIME;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }
  }

  handleVerticalMovement(input) {

    if (input.inputPressed.b || input.inputPressed.a) {
      this.jumpBufferTimer = PLAYER_CONFIG.JUMP_BUFFER_WINDOW;
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer--;
    }

    if (this.jumpBufferTimer > 0 && (this.coyoteTimer > 0 || !this.inAir) && !this.stuckInWall) {
      if (input.inputDown.b) this.handleJump();
      if (input.inputDown.a) {
        this.handleJump(true);
      }
    }
    this.imposeGravity(input);
  }

  handleHorizontalMovement(input) {
    const physics = PLAYER_CONFIG.PHYSICS.horizontal;
    let inputHitDirection = input.inputDown.right - input.inputDown.left;
    this.handleSprintMeter(input, inputHitDirection !== 0);
    let topSpeed = input.inputDown.x
      ? physics.maxRunSpeed
      : physics.maxWalkSpeed; // todo: add sprint too
    if (this.sprintMeter === physics.timeRunningToReachSprint) {
      topSpeed = physics.maxSprintSpeed;
    }
    if (this.isDucking && !this.inAir) {
      inputHitDirection = 0; // can't move if ducking on the ground
    }

    if (inputHitDirection !== 0) this.facingRight = inputHitDirection > 0;

    if (inputHitDirection === 0) {
      // no directional input, decelerate
      if (!this.inAir) {
        if (this.dx < 0) {
          this.dx += physics.decelerationNoPlayerInput;
          if (this.dx > 0) this.dx = 0;
        } else if (this.dx > 0) {
          this.dx -= physics.decelerationNoPlayerInput;
          if (this.dx < 0) this.dx = 0;
        }
      }
    } else {
      // directional input
      if (
        (this.dx > 0 && inputHitDirection < 0) ||
        (this.dx < 0 && inputHitDirection > 0)
      ) {
        // skidding
        const decel = input.inputDown.x
          ? physics.decelerationSkiddingRunning
          : physics.decelerationSkidding;
        if (this.dx < 0) {
          this.dx += decel;
          if (this.dx > 0) this.dx = 0;
        } else if (this.dx > 0) {
          this.dx -= decel;
          if (this.dx < 0) this.dx = 0;
        }
      } else if (Math.abs(this.dx) < topSpeed) {
        // accelerate
        this.dx += inputHitDirection * physics.acceleration;
        // clamp to top speed
        if (this.dx > topSpeed) this.dx = topSpeed;
        if (this.dx < -topSpeed) this.dx = -topSpeed;
      } else if (Math.abs(this.dx) > topSpeed) {
        // decelerate to top speed if over it
        if (this.dx < 0) {
          this.dx += physics.decelerationNoPlayerInput;
          if (this.dx > -topSpeed) this.dx = -topSpeed;
        } else if (this.dx > 0) {
          this.dx -= physics.decelerationNoPlayerInput;
          if (this.dx < topSpeed) this.dx = topSpeed;
        }
      }

      // if player is somehow over max speed (e.g. bumped by enemy), clamp it down
      if (this.dx > physics.maxSprintSpeed) this.dx = physics.maxSprintSpeed;
    }
  }

  handleJump(spinjump = false) {
    const verticalPhysics = PLAYER_CONFIG.PHYSICS.vertical;
    const horizontalPhysics = PLAYER_CONFIG.PHYSICS.horizontal;
    const jumpForces = spinjump
    ? verticalPhysics.spinJumpForces
    : verticalPhysics.normalJumpForces;
    const horizontalSpeed = Math.abs(this.dx);
    if (this.sprintMeter === horizontalPhysics.timeRunningToReachSprint) {
      this.sprintJumping = true;
    }
    const speedIndex = Math.min(
      Math.floor(horizontalSpeed / 8),
      jumpForces.length - 1,
    );
    // Note: gravity always applies so jump force has gravity taken off
    const jumpForce = jumpForces[speedIndex];
    this.dy = jumpForce;
    this.inAir = true;
    this.spinjumping = spinjump;

    this.coyoteTimer = 0;

    this.game.audioManager.playSfx(spinjump ? "spinjump" : "jump");
  }

  handleRouletteCollision() {
    // Only check when player is moving upward (hitting from below)
    if (this.dy >= 0) return;
    if (this.game.otpComplete) return;

    const playerLeft = this.x + this.hitbox.xOffset;
    const playerTop = this.y + this.hitbox.yOffset;
    const playerRight = playerLeft + this.hitbox.width;
    const playerBottom = playerTop + this.hitbox.height;

    const roulette = this.game.roulette;
    for (const item of roulette.items) {
        // Skip items that are already bouncing
        if (item.state === "bouncing") continue;

        const itemDrawY = item.y + item.bounceOffset;
        const itemLeft = item.x + item.hitbox.xOffset;
        const itemTop = itemDrawY + item.hitbox.yOffset;
        const itemRight = itemLeft + item.hitbox.width;
        const itemBottom = itemTop + item.hitbox.height;

        if (
          playerLeft < itemRight &&
          playerRight > itemLeft &&
          playerTop < itemBottom &&
          playerBottom > itemTop
        ) {
          // bonk the player down then add the item index to the input display

          this.dy = PLAYER_CONFIG.PHYSICS.vertical.entityBonkVelocity;
          this.jumpBufferTimer = 0;

          item.startBounce();
          this.game.audioManager.playSfx("switch");

          if (item.index === 10) {
            this.game.removeCharacterFromInputDisplay();
          } else {
            this.game.addCharacterToInputDisplay(item.index.toString());
          }
          return; // only handle one collision per frame
        }
    }
  }

  handleTileCollision(input) {
    // Collision detection needs to be done at whole pixel values
    let collisionX = Math.floor(this.x);
    let collisionY = Math.floor(this.y);

    const physics = PLAYER_CONFIG.PHYSICS.vertical;
    const gravity =
      input.inputDown.b || input.inputDown.a
        ? physics.gravityHoldingJump
        : physics.gravity;
    const tilemap = this.game.tilemap;
    const playerIsMovingDown = this.dy >= 0;
    const tileInteractionPoints = PLAYER_CONFIG.TILE_INTERACTION_POINTS;

    // vertical collision detection
    // get feet points
    const floorThreshold = PLAYER_CONFIG.FLOOR_THRESHOLD;
    const feetPoints = tileInteractionPoints.feet;
    const solidLeftFoot = tilemap.meetingSolidTileAtPixel(
      collisionX + feetPoints.x[0],
      collisionY + feetPoints.y,
    );
    const solidRightFoot = tilemap.meetingSolidTileAtPixel(
      collisionX + feetPoints.x[1],
      collisionY + feetPoints.y,
    );
    const standingOnSolidTile = solidLeftFoot || solidRightFoot;
    this.collisionState.below = standingOnSolidTile;

    // get head points
    const headPoints = tileInteractionPoints.head;
    const solidHead = tilemap.meetingSolidTileAtPixel(
      collisionX + headPoints.x,
      collisionY + headPoints.y[this.isBig && !this.isDucking ? 1 : 0],
    );
    this.collisionState.above = solidHead;



    // vertical collision resolution
    if (playerIsMovingDown || !this.inAir) {
      if (standingOnSolidTile) {
        const localY = mod16(collisionY);
        if (localY < floorThreshold) {
          // snap to floor
          this.y = Math.floor(Math.round(this.y / 16) * 16);
          // gravity still applies even when standing on ground
          this.dy = gravity; 
          this.inAir = false;
          this.spinjumping = false;
          this.sprintJumping = false;
        }
      } else if (!this.inAir) {
        // you walked off a ledge, so put in air
        this.inAir = true;
      }
    } 
    if (solidHead && !standingOnSolidTile) { 
      // Bonked
      
      // snap player down so head point is flush with bottom of tile. use 15 instead of 16 so player can duck jump in small gaps
      const newY =
        Math.floor(
          (collisionY + headPoints.y[this.isBig && !this.isDucking ? 1 : 0]) /
            16,
        ) *
          16 -
        headPoints.y[this.isBig && !this.isDucking ? 1 : 0] +
        15;
      if (this.y < newY) {
        this.y = newY;
        if (this.dy < gravity) this.dy = gravity; // start falling immediately
        this.jumpBufferTimer = 0; // cancel jump buffer to prevent spam
      }
    }

    collisionY = Math.floor(this.y); // update this for horizontal now

    // horizontal collision detection
    // get side points
    const sidePoints = tileInteractionPoints.side;
    const checkingRightSide = mod16(this.x) < 8;
    const sideIndex = checkingRightSide ? 1 : 0;
    const solidUpperSide = tilemap.meetingSolidTileAtPixel(
      collisionX + sidePoints.upper.x[sideIndex],
      collisionY + sidePoints.upper.y[this.isBig && !this.isDucking ? 1 : 0],
    );
    const solidLowerSide = tilemap.meetingSolidTileAtPixel(
      collisionX + sidePoints.lower.x[sideIndex],
      collisionY + sidePoints.lower.y[this.isBig && !this.isDucking ? 1 : 0],
    );
    const solidSide = solidUpperSide || solidLowerSide;
    this.collisionState.left = checkingRightSide && solidSide;
    this.collisionState.right = !checkingRightSide && solidSide;

    // horizontal resolution
    if (solidSide && !this.stuckInWall) {
      const playerLeftSideOffset = sidePoints.upper.x[sideIndex];
      const playerRightSideOffset = sidePoints.lower.x[sideIndex] + 1; // +1 to not be inside the right wall
      const pushOutBy = checkingRightSide ? -1 : 1;
      const offsetX = checkingRightSide
        ? playerRightSideOffset
        : playerLeftSideOffset;
      const edgeX = collisionX + offsetX;
      const localX = mod16(edgeX);
      if (Math.floor(localX) !== 0) {
        // Eject player from the wall
        this.x += pushOutBy;
        if (
          (this.dx < 0 && pushOutBy === 1) ||
          (this.dx > 0 && pushOutBy === -1)
        ) {
          this.dx = 0;
        }
      }
    }
  }
}

export default Player;
export { PLAYER_STATES };