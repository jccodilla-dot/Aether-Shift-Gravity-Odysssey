import { gameAudio } from './audio';
import { drawPlayerCharacter } from './characterRenderer';
import { GRAVITY_ORDER, GRAVITY_PRESETS, SPECIAL_SKILLS, ZONES } from './catalog';
import {
  GravityPreset,
  HudSnapshot,
  PlayerProfile,
  SkillId,
  WeaponId,
  ZoneId,
} from './types';
import {
  drawColossalBoss,
  drawEnemySprite,
  drawZoneBackground,
  RenderBoss,
  RenderEnemy,
} from './zoneRenderer';

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  isCeiling?: boolean;
  hazard?: 'magma' | 'spikes';
}

interface EnvZone {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'bubble_up' | 'wind_up' | 'grav_well';
}

interface Gem {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  value: number;
  bobOffset: number;
  isCoin?: boolean;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  fromPlayer: boolean;
  color: string;
  life: number;
  pierce?: boolean;
  boomerang?: boolean;
  explosive?: boolean;
  hitIds?: Set<number>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravityScale: number;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  scale: number;
}

interface EnemyEntity extends RenderEnemy {
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  fireCooldown: number;
  patrolRange: number;
  alive: boolean;
}

interface BossEntity extends RenderBoss {
  vx: number;
  vy: number;
  anchorX: number;
  anchorY: number;
  attackTimer: number;
  patternIndex: number;
  defeated: boolean;
  deathBurstTimer: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onStageClear: (summary: HudSnapshot) => void;
  onGameOver: (summary: HudSnapshot) => void;
  onPauseRequest: () => void;
}

export class GravityPlatformerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;
  private profile: PlayerProfile;
  private zoneId: ZoneId;

  private rafId: number | null = null;
  private lastTime = 0;
  private running = false;
  private paused = false;
  private worldTime = 0;
  private hitstopTimer = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;

  // Logical viewport coordinates (scaled smoothly to fill canvas)
  private viewW = 1280;
  private viewH = 720;
  private worldH = 720;
  private camX = 0;

  // Player state
  private px = 120;
  private py = 480;
  private pvx = 0;
  private pvy = 0;
  private pFacing: 1 | -1 = 1;
  private pGrounded = false;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private pHp = 100;
  private pMaxHp = 100;
  private pInvuln = 0;
  private pHitFlash = 0;
  private pScaleX = 1;
  private pScaleY = 1;
  private pFlipAngle = 0;

  // Gravity Mechanics
  private gravityPreset: GravityPreset = 'normal';
  private gravityFactor = 1.0;
  private shiftCombo = 0;
  private shiftTimer = 0;

  // Combat & Skills
  private weapon: WeaponId = 'sword';
  private comboStep = 0;
  private comboResetTimer = 0;
  private attackCooldown = 0;
  private attackAnimTimer = 0;
  private equippedSkill: SkillId | null = null;
  private skillCooldown = 0;
  private shieldTimer = 0;
  private wingsTimer = 0;
  private chronoTimer = 0;

  // Scoring & Dynamic Difficulty
  private score = 0;
  private runCoins = 0;
  private runInvertedGems = 0;
  private runComboFinishers = 0;
  private runMidAirShifts = 0;
  private runShiftScore = 0;
  private difficultyMultiplier = 1.0;
  private perfScore = 0;

  // World entities
  private platforms: Platform[] = [];
  private envZones: EnvZone[] = [];
  private gems: Gem[] = [];
  private enemies: EnemyEntity[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private boss!: BossEntity;
  private bossArenaLocked = false;
  private stageEndingTimer = 0;

  // Input state: held vs justPressed
  private held = new Set<string>();
  private justPressed = new Set<string>();
  private touchMoveX = 0;

  private hudEmitAccum = 0;

  constructor(
    canvas: HTMLCanvasElement,
    profile: PlayerProfile,
    zoneId: ZoneId,
    callbacks: EngineCallbacks
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas unsupported');
    this.ctx = context;
    this.profile = profile;
    this.zoneId = zoneId;
    this.callbacks = callbacks;

    this.weapon = profile.equippedWeapon;
    this.pMaxHp = 100 + (profile.vitalityLevel - 1) * 20;
    this.pHp = this.pMaxHp;
    if (profile.unlockedSkills.length > 0) {
      this.equippedSkill = profile.unlockedSkills[profile.unlockedSkills.length - 1];
    }

    this.buildLevel(zoneId);
    this.handleResize();
    this.bindInputs();
  }

  public updateProfile(next: PlayerProfile) {
    this.profile = next;
    this.weapon = next.equippedWeapon;
    this.pMaxHp = 100 + (next.vitalityLevel - 1) * 20;
    if (next.infiniteLife) {
      this.pHp = this.pMaxHp;
    }
    if (next.unlockedSkills.length > 0 && !this.equippedSkill) {
      this.equippedSkill = next.unlockedSkills[next.unlockedSkills.length - 1];
    }
  }

  public setTouchMoveX(val: number) {
    this.touchMoveX = Math.max(-1, Math.min(1, val));
  }

  public triggerTouchAction(action: 'jump' | 'attack' | 'invert' | 'cycle_grav' | 'skill') {
    gameAudio.unlock();
    if (action === 'jump') this.justPressed.add('Space');
    if (action === 'attack') this.justPressed.add('KeyJ');
    if (action === 'invert') this.justPressed.add('KeyF');
    if (action === 'cycle_grav') this.justPressed.add('KeyE');
    if (action === 'skill') this.justPressed.add('KeyR');
  }

  public selectSkill(skill: SkillId) {
    this.equippedSkill = skill;
  }

  public setGravityPreset(preset: GravityPreset) {
    if (this.gravityPreset === preset) return;
    this.gravityPreset = preset;
    gameAudio.playGravityShift(preset);
    if (!this.pGrounded) {
      this.shiftCombo = Math.min(5, this.shiftCombo + 1);
      this.shiftTimer = 3.5 + (this.profile.gravMasteryLevel - 1) * 0.4;
      this.runMidAirShifts++;
      this.spawnText(
        this.px,
        this.py - 42,
        `${GRAVITY_PRESETS[preset].shortLabel}${this.shiftCombo > 1 ? ` x${this.shiftCombo}` : ''}`,
        GRAVITY_PRESETS[preset].color,
        1.1
      );
    }
    this.pScaleX = 1.24;
    this.pScaleY = 0.78;
    this.spawnBurst(this.px, this.py, GRAVITY_PRESETS[preset].color, 12);
  }

  private buildLevel(zoneId: ZoneId) {
    const zone = ZONES[zoneId];
    const len = zone.levelLength;
    this.platforms = [];
    this.envZones = [];
    this.gems = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];

    // Main floor segments & ceiling rails for inverted gravity platforming
    let curX = 0;
    let segIdx = 0;
    while (curX < len - 650) {
      const segW = 360 + ((segIdx * 97) % 180);
      const gap = segIdx === 0 ? 0 : 105 + ((segIdx * 53) % 75);
      curX += gap;

      // Floor platform
      const floorY = 620 - ((segIdx % 3) * 38);
      this.platforms.push({ x: curX, y: floorY, w: segW, h: 120 });

      // Ceiling rail above gaps so player can invert gravity (-1G) seamlessly!
      if (segIdx % 2 === 1) {
        this.platforms.push({ x: curX - 75, y: 68, w: segW + 90, h: 40, isCeiling: true });
      }

      // Elevated mid-air stepping platforms
      if (segIdx > 0) {
        const midY = 390 - ((segIdx * 61) % 140);
        this.platforms.push({ x: curX + 45, y: midY, w: 170, h: 24 });
      }

      // Cave magma hazard on floor occasionally (teaches ceiling inversion!)
      if (zone.key === 'cave' && segIdx % 3 === 2) {
        this.platforms.push({
          x: curX + 110,
          y: floorY - 12,
          w: 90,
          h: 14,
          hazard: 'magma',
        });
      }

      // Environmental zones per biome
      if (zone.key === 'sea' && segIdx % 2 === 0) {
        this.envZones.push({ x: curX + 140, y: 140, w: 90, h: 480, kind: 'bubble_up' });
      } else if (zone.key === 'sky' && segIdx % 2 === 1) {
        this.envZones.push({ x: curX - 40, y: 110, w: 105, h: 520, kind: 'wind_up' });
      } else if ((zone.key === 'space' || zone.key === 'galactic') && segIdx % 3 === 1) {
        this.envZones.push({ x: curX + 150, y: 260, w: 160, h: 160, kind: 'grav_well' });
      }

      // Curved gem arcs rewarding mid-air gravity shifts
      for (let g = 0; g < 5; g++) {
        const gx = curX + 40 + g * 58;
        const gy =
          segIdx % 2 === 1
            ? 145 + Math.sin((g / 4) * Math.PI) * 55 // high ceiling arc for inverted / low-g!
            : floorY - 135 - Math.sin((g / 4) * Math.PI) * 95;
        this.gems.push({
          id: this.gems.length + 1,
          x: gx,
          y: gy,
          collected: false,
          value: 100,
          bobOffset: g * 0.7,
        });
      }

      // Spawn 1-2 distinct zone enemies per segment
      if (segIdx > 0) {
        const kindA = zone.enemyTypes[segIdx % zone.enemyTypes.length];
        const kindB = zone.enemyTypes[(segIdx + 1) % zone.enemyTypes.length];
        this.spawnEnemy(kindA, curX + 170, floorY - 30, segIdx);
        if (segIdx % 2 === 0) {
          this.spawnEnemy(kindB, curX + 270, 260 + (segIdx % 3) * 45, segIdx + 10);
        }
      }

      curX += segW;
      segIdx++;
    }

    // Colossal Boss Arena at the end of the zone
    const arenaStart = len - 650;
    this.platforms.push({ x: arenaStart, y: 630, w: 1200, h: 120 });
    this.platforms.push({ x: arenaStart + 40, y: 64, w: 1120, h: 36, isCeiling: true });
    this.platforms.push({ x: arenaStart + 160, y: 440, w: 180, h: 22 });
    this.platforms.push({ x: arenaStart + 580, y: 390, w: 180, h: 22 });

    this.boss = {
      active: false,
      zoneId,
      x: arenaStart + 920,
      y: 340,
      w: 180,
      h: 180,
      hp: zone.bossHpBase,
      maxHp: zone.bossHpBase,
      phase: 1,
      hitFlash: 0,
      telegraphTimer: 0,
      attackPattern: 'barrage',
      animTime: 0,
      vx: 0,
      vy: 0,
      anchorX: arenaStart + 900,
      anchorY: 340,
      attackTimer: 1.6,
      patternIndex: 0,
      defeated: false,
      deathBurstTimer: 0,
    };

    // Reset player start
    this.px = 120;
    this.py = 540;
    this.pvx = 0;
    this.pvy = 0;
    this.camX = 0;
    this.gravityPreset = 'normal';
    this.gravityFactor = 1.0;
    this.pFlipAngle = 0;
  }

  private spawnEnemy(kind: EnemyEntity['kind'], x: number, y: number, seed: number) {
    const baseHp = 55 + this.zoneId * 18;
    const isHeavy = kind === 'crab' || kind === 'golem' || kind === 'chronoknight' || kind === 'aeroturret' || kind === 'astralturret';
    this.enemies.push({
      id: this.enemies.length + 1,
      kind,
      x,
      y,
      w: isHeavy ? 44 : 36,
      h: isHeavy ? 44 : 36,
      hp: isHeavy ? baseHp * 1.45 : baseHp,
      maxHp: isHeavy ? baseHp * 1.45 : baseHp,
      facing: -1,
      hitFlash: 0,
      telegraphTimer: 0,
      animSeed: seed,
      vx: 0,
      vy: 0,
      baseX: x,
      baseY: y,
      fireCooldown: 1.4 + (seed % 3) * 0.5,
      patrolRange: 95,
      alive: true,
    });
  }

  private bindInputs() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('pointerdown', this.onCanvasPointerDown);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  public destroy() {
    this.stop();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('pointerdown', this.onCanvasPointerDown);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    gameAudio.stopMusic();
  }

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onCanvasPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    gameAudio.unlock();
    if (e.button === 0) {
      this.justPressed.add('KeyJ');
    } else if (e.button === 2) {
      this.justPressed.add('KeyF');
    }
  };

  private onBlur = () => {
    this.held.clear();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    gameAudio.unlock();
    if (!this.held.has(e.code)) {
      this.justPressed.add(e.code);
    }
    this.held.add(e.code);

    if (e.code === 'Escape') {
      this.callbacks.onPauseRequest();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.held.delete(e.code);
  };

  private handleResize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = parent.getBoundingClientRect();
    this.canvas.width = Math.max(320, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(240, Math.floor(rect.height * dpr));
    const aspect = rect.width / Math.max(1, rect.height);
    this.viewH = this.worldH;
    this.viewW = Math.round(this.worldH * aspect);
  };

  public start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    gameAudio.startMusic(this.zoneId, this.boss.active);
    this.loop(this.lastTime);
  }

  public setPaused(p: boolean) {
    this.paused = p;
    if (p) {
      this.held.clear();
      gameAudio.stopMusic();
    } else {
      this.lastTime = performance.now();
      gameAudio.startMusic(this.zoneId, this.boss.active);
    }
  }

  public stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (now: number) => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    if (!this.paused) {
      this.update(dt);
    }
    this.render();
  };

  private update(dt: number) {
    this.worldTime += dt;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }

    // Handle edge-triggered actions
    this.processEdgeActions();

    // Timers
    if (this.pInvuln > 0) this.pInvuln = Math.max(0, this.pInvuln - dt);
    if (this.pHitFlash > 0) this.pHitFlash = Math.max(0, this.pHitFlash - dt);
    if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.attackAnimTimer > 0) this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) this.comboStep = 0;
    }
    if (this.skillCooldown > 0) this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    if (this.shieldTimer > 0) this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    if (this.wingsTimer > 0) this.wingsTimer = Math.max(0, this.wingsTimer - dt);
    if (this.chronoTimer > 0) this.chronoTimer = Math.max(0, this.chronoTimer - dt);
    if (this.shiftTimer > 0) {
      this.shiftTimer -= dt;
      if (this.shiftTimer <= 0) this.shiftCombo = 0;
    }

    // Smooth gravity interpolation & mid-air flip rotation
    const targetG = GRAVITY_PRESETS[this.gravityPreset].factor;
    this.gravityFactor += (targetG - this.gravityFactor) * Math.min(1, dt * 11);
    const targetFlip = this.gravityPreset === 'inverted' ? Math.PI : 0;
    this.pFlipAngle += (targetFlip - this.pFlipAngle) * Math.min(1, dt * 12);

    // Squash & stretch settle
    this.pScaleX += (1 - this.pScaleX) * Math.min(1, dt * 14);
    this.pScaleY += (1 - this.pScaleY) * Math.min(1, dt * 14);

    // Horizontal Movement
    let moveX = this.touchMoveX;
    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) moveX -= 1;
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) moveX += 1;
    moveX = Math.max(-1, Math.min(1, moveX));

    const maxSpeed = 340 + (this.profile.gravMasteryLevel - 1) * 14;
    if (moveX !== 0) {
      this.pFacing = moveX > 0 ? 1 : -1;
    }
    const accel = this.pGrounded ? 2600 : 1750;
    const targetVx = moveX * maxSpeed;
    this.pvx += (targetVx - this.pvx) * Math.min(1, (accel * dt) / Math.max(1, maxSpeed));

    // Apply Gravity + Environmental Forces (bubbles, wind updrafts, gravity wells)
    const baseGravity = 1380;
    let gravAccel = baseGravity * this.gravityFactor;

    for (const ez of this.envZones) {
      if (this.px >= ez.x && this.px <= ez.x + ez.w && this.py >= ez.y && this.py <= ez.y + ez.h) {
        if (ez.kind === 'bubble_up' || ez.kind === 'wind_up') {
          gravAccel -= 1150;
          if (Math.random() < 0.25) {
            this.particles.push({
              x: this.px + (Math.random() - 0.5) * 28,
              y: this.py + 16,
              vx: (Math.random() - 0.5) * 20,
              vy: -180,
              size: 4,
              color: ez.kind === 'wind_up' ? '#FDE047' : '#67E8F9',
              life: 0.45,
              maxLife: 0.45,
              gravityScale: 0,
            });
          }
        } else if (ez.kind === 'grav_well') {
          const cx = ez.x + ez.w / 2;
          const cy = ez.y + ez.h / 2;
          this.pvx += (cx - this.px) * 1.4 * dt;
          this.pvy += (cy - this.py) * 1.4 * dt;
        }
      }
    }

    // Free-flight lift when Aether Wings active or holding Jump in Zero-G
    if (
      (this.wingsTimer > 0 || this.gravityPreset === 'zero') &&
      (this.held.has('Space') || this.held.has('KeyW') || this.held.has('ArrowUp'))
    ) {
      const liftDir = this.gravityFactor < 0 ? 1 : -1;
      this.pvy += liftDir * 1150 * dt;
    }

    this.pvy += gravAccel * dt;
    this.pvy = Math.max(-720, Math.min(760, this.pvy));

    // Coyote & Jump Buffer
    if (this.pGrounded) {
      this.coyoteTimer = 0.11;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
      if (this.coyoteTimer > 0) {
        const jumpDir = this.gravityFactor < 0 ? 1 : -1;
        const jumpPower = this.gravityPreset === 'low' ? 520 : 590;
        this.pvy = jumpDir * jumpPower;
        this.pGrounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.pScaleX = 0.8;
        this.pScaleY = 1.25;
        gameAudio.playJump(this.gravityFactor);
        this.spawnBurst(this.px, this.py + (jumpDir < 0 ? 22 : -22), '#F8FAFC', 7);
      }
    }

    // Move & Collide Platforms
    const prevGrounded = this.pGrounded;
    this.px += this.pvx * dt;
    const minX = this.bossArenaLocked ? ZONES[this.zoneId].levelLength - 640 : 24;
    const maxX = ZONES[this.zoneId].levelLength + 490;
    this.px = Math.max(minX, Math.min(maxX, this.px));

    this.py += this.pvy * dt;
    this.pGrounded = false;

    const halfW = 14;
    const halfH = 28;

    for (const plat of this.platforms) {
      if (plat.hazard) {
        if (
          this.px + halfW > plat.x &&
          this.px - halfW < plat.x + plat.w &&
          this.py + halfH > plat.y &&
          this.py - halfH < plat.y + plat.h
        ) {
          this.damagePlayer(15);
        }
        continue;
      }

      if (this.px + halfW > plat.x && this.px - halfW < plat.x + plat.w) {
        // Landing downward (normal gravity)
        if (this.pvy >= 0 && this.py + halfH >= plat.y && this.py + halfH - this.pvy * dt <= plat.y + 18) {
          this.py = plat.y - halfH;
          this.pvy = 0;
          if (this.gravityFactor >= 0) {
            this.pGrounded = true;
            if (!prevGrounded) {
              this.pScaleX = 1.22;
              this.pScaleY = 0.8;
              gameAudio.playLand(this.gravityFactor);
            }
          }
        }
        // Landing upward (inverted gravity on ceiling!)
        else if (
          this.pvy <= 0 &&
          this.py - halfH <= plat.y + plat.h &&
          this.py - halfH - this.pvy * dt >= plat.y + plat.h - 18
        ) {
          this.py = plat.y + plat.h + halfH;
          this.pvy = 0;
          if (this.gravityFactor < 0) {
            this.pGrounded = true;
            if (!prevGrounded) {
              this.pScaleX = 1.22;
              this.pScaleY = 0.8;
              gameAudio.playLand(this.gravityFactor);
            }
          }
        }
      }
    }

    // Out-of-bounds pit/space recovery
    if (this.py > this.worldH + 90 || this.py < -110) {
      if (this.profile.infiniteLife) {
        this.py = 300;
        this.pvy = 0;
        this.setGravityPreset('normal');
        gameAudio.playPlayerHurt(true);
        this.spawnBurst(this.px, this.py, '#38BDF8', 16);
      } else {
        this.damagePlayer(25);
        this.py = 300;
        this.pvy = 0;
        this.setGravityPreset('normal');
      }
    }

    // Camera follow
    const zone = ZONES[this.zoneId];
    if (!this.bossArenaLocked && this.px >= zone.levelLength - 520) {
      this.bossArenaLocked = true;
      this.boss.active = true;
      gameAudio.startMusic(this.zoneId, true);
      gameAudio.playBossTelegraph();
      this.spawnText(this.px + 120, 180, `${zone.bossName.toUpperCase()} APPROACHES!`, '#F43F5E', 1.4);
    }

    const targetCamX = this.bossArenaLocked
      ? zone.levelLength - 650
      : Math.max(0, Math.min(zone.levelLength - 650, this.px - this.viewW * 0.34));
    this.camX += (targetCamX - this.camX) * Math.min(1, dt * 8);

    // Collect Gems & Coins
    for (const gem of this.gems) {
      if (gem.collected) continue;
      if (Math.hypot(gem.x - this.px, gem.y - this.py) < 34) {
        gem.collected = true;
        if (gem.isCoin) {
          this.runCoins += gem.value;
          this.score += 50;
          gameAudio.playGemPickup(1);
          this.spawnText(gem.x, gem.y - 12, `+${gem.value} COIN`, '#FBBF24', 0.9);
        } else {
          const mult = Math.max(1, this.shiftCombo);
          const pts = gem.value * mult;
          this.score += pts;
          if (mult > 1) {
            this.runShiftScore += pts;
          }
          if (this.gravityPreset === 'inverted') {
            this.runInvertedGems++;
          }
          gameAudio.playGemPickup(mult);
          this.spawnBurst(gem.x, gem.y, mult > 1 ? '#FDE047' : '#38BDF8', 8);
          this.spawnText(
            gem.x,
            gem.y - 12,
            mult > 1 ? `+${pts} SHIFT x${mult}!` : `+${pts}`,
            mult > 1 ? '#FDE047' : '#38BDF8',
            mult > 1 ? 1.15 : 0.95
          );
        }
      }
    }

    // Update Projectiles, Enemies, Boss, Particles
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateParticles(dt);

    // Dynamic Difficulty Director
    const perfRatio = Math.max(0, Math.min(1, this.perfScore / 15));
    const targetDiff = 1.0 + perfRatio * 1.15 + (this.zoneId - 1) * 0.12;
    this.difficultyMultiplier += (targetDiff - this.difficultyMultiplier) * Math.min(1, dt * 0.6);

    // Stage Clear sequence after Boss explodes
    if (this.boss.defeated) {
      this.stageEndingTimer += dt;
      if (this.stageEndingTimer >= 1.9) {
        this.running = false;
        gameAudio.stopMusic();
        gameAudio.playStageClear();
        this.callbacks.onStageClear(this.getHudSnapshot());
        return;
      }
    }

    // Emit HUD snapshot ~15fps to avoid unnecessary React re-renders
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.065) {
      this.hudEmitAccum = 0;
      this.callbacks.onHudUpdate(this.getHudSnapshot());
    }
  }

  private processEdgeActions() {
    if (this.justPressed.has('Space') || this.justPressed.has('KeyW') || this.justPressed.has('ArrowUp')) {
      this.jumpBufferTimer = 0.12;
    }

    // Direct gravity preset hotkeys 1-5
    if (this.justPressed.has('Digit1')) this.setGravityPreset('zero');
    if (this.justPressed.has('Digit2')) this.setGravityPreset('low');
    if (this.justPressed.has('Digit3')) this.setGravityPreset('normal');
    if (this.justPressed.has('Digit4')) this.setGravityPreset('heavy');
    if (this.justPressed.has('Digit5')) this.setGravityPreset('inverted');

    // Cycle gravity presets Q / E
    if (this.justPressed.has('KeyE')) {
      const idx = GRAVITY_ORDER.indexOf(this.gravityPreset);
      this.setGravityPreset(GRAVITY_ORDER[(idx + 1) % GRAVITY_ORDER.length]);
    }
    if (this.justPressed.has('KeyQ')) {
      const idx = GRAVITY_ORDER.indexOf(this.gravityPreset);
      this.setGravityPreset(GRAVITY_ORDER[(idx - 1 + GRAVITY_ORDER.length) % GRAVITY_ORDER.length]);
    }

    // Quick Invert toggle F or ShiftLeft
    if (this.justPressed.has('KeyF') || this.justPressed.has('ShiftLeft')) {
      this.setGravityPreset(this.gravityPreset === 'inverted' ? 'normal' : 'inverted');
    }

    // Weapon Attack J or Enter or Mouse Click
    if (this.justPressed.has('KeyJ') || this.justPressed.has('KeyX')) {
      this.performWeaponCombo();
    }

    // Special Skill R
    if (this.justPressed.has('KeyR')) {
      this.activateSpecialSkill();
    }

    this.justPressed.clear();
  }

  private performWeaponCombo() {
    if (this.attackCooldown > 0) return;

    this.comboStep = (this.comboStep % 3) + 1;
    this.comboResetTimer = 1.05;
    this.attackAnimTimer = 0.25;
    const speedFactor = this.chronoTimer > 0 ? 0.65 : 1;
    this.attackCooldown = (this.weapon === 'gun' ? 0.2 : 0.24) * speedFactor;

    const dmgScale = 1 + (this.profile.powerLevel - 1) * 0.22;
    gameAudio.playAttack(this.weapon, this.comboStep);

    if (this.comboStep === 3) {
      this.runComboFinishers++;
    }

    if (this.weapon === 'sword') {
      const reach = this.comboStep === 3 ? 96 : 74;
      const dmg = Math.round((this.comboStep === 3 ? 85 : this.comboStep === 2 ? 48 : 38) * dmgScale);
      const hitX = this.px + this.pFacing * (reach * 0.55);

      // Deflect nearby enemy projectiles!
      for (const proj of this.projectiles) {
        if (!proj.fromPlayer && Math.hypot(proj.x - hitX, proj.y - this.py) < reach) {
          proj.fromPlayer = true;
          proj.vx = this.pFacing * 560;
          proj.vy = -proj.vy * 0.4;
          proj.damage = 45;
          proj.color = '#F472B6';
          gameAudio.playDeflect();
          this.spawnBurst(proj.x, proj.y, '#F472B6', 8);
        }
      }

      // Hit enemies in melee arc
      this.applyMeleeHit(hitX, this.py, reach, dmg, this.comboStep === 3);

      // Combo 3 finisher fires a Crescent Shockwave!
      if (this.comboStep === 3) {
        this.projectiles.push({
          x: this.px + this.pFacing * 28,
          y: this.py,
          vx: this.pFacing * 520,
          vy: 0,
          radius: 22,
          damage: Math.round(55 * dmgScale),
          fromPlayer: true,
          color: '#FBBF24',
          life: 0.75,
          pierce: true,
          hitIds: new Set(),
        });
        this.triggerShake(0.14, 6);
      }
    } else if (this.weapon === 'gun') {
      if (this.comboStep === 1) {
        this.projectiles.push({
          x: this.px + this.pFacing * 24,
          y: this.py - 2,
          vx: this.pFacing * 720,
          vy: 0,
          radius: 7,
          damage: Math.round(30 * dmgScale),
          fromPlayer: true,
          color: '#38BDF8',
          life: 1.1,
        });
      } else if (this.comboStep === 2) {
        // Twin scatter + mid-air recoil hop!
        for (const vy of [-110, 110]) {
          this.projectiles.push({
            x: this.px + this.pFacing * 24,
            y: this.py - 2,
            vx: this.pFacing * 680,
            vy,
            radius: 7,
            damage: Math.round(26 * dmgScale),
            fromPlayer: true,
            color: '#F472B6',
            life: 0.9,
          });
        }
        if (!this.pGrounded) {
          this.pvy = (this.gravityFactor < 0 ? 1 : -1) * 180;
        }
      } else {
        // Step 3: Piercing Hyper-Rail Beam
        this.projectiles.push({
          x: this.px + this.pFacing * 28,
          y: this.py - 2,
          vx: this.pFacing * 1020,
          vy: 0,
          radius: 15,
          damage: Math.round(80 * dmgScale),
          fromPlayer: true,
          color: '#FEF08A',
          life: 0.65,
          pierce: true,
          hitIds: new Set(),
        });
        this.triggerShake(0.14, 7);
      }
    } else {
      // Orbital Nova Staff
      if (this.comboStep === 1) {
        this.projectiles.push({
          x: this.px + this.pFacing * 20,
          y: this.py - 4,
          vx: this.pFacing * 520,
          vy: 0,
          radius: 10,
          damage: Math.round(34 * dmgScale),
          fromPlayer: true,
          color: '#C084FC',
          life: 1.2,
        });
      } else if (this.comboStep === 2) {
        // Boomerang gravity ring
        this.projectiles.push({
          x: this.px + this.pFacing * 24,
          y: this.py - 4,
          vx: this.pFacing * 480,
          vy: 0,
          radius: 17,
          damage: Math.round(28 * dmgScale),
          fromPlayer: true,
          color: '#38BDF8',
          life: 1.4,
          boomerang: true,
          pierce: true,
          hitIds: new Set(),
        });
      } else {
        // Supernova Detonation Orb
        this.projectiles.push({
          x: this.px + this.pFacing * 24,
          y: this.py - 4,
          vx: this.pFacing * 420,
          vy: 0,
          radius: 22,
          damage: Math.round(88 * dmgScale),
          fromPlayer: true,
          color: '#F472B6',
          life: 1.1,
          explosive: true,
        });
        this.triggerShake(0.16, 8);
      }
    }
  }

  private applyMeleeHit(cx: number, cy: number, radius: number, damage: number, heavy: boolean) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - cx, e.y - cy) <= radius + e.w * 0.45) {
        this.damageEnemy(e, damage, heavy);
      }
    }
    if (this.boss.active && !this.boss.defeated) {
      if (Math.hypot(this.boss.x - cx, this.boss.y - cy) <= radius + this.boss.w * 0.52) {
        this.damageBoss(damage, heavy);
      }
    }
  }

  private activateSpecialSkill() {
    if (!this.equippedSkill || this.skillCooldown > 0) return;
    const cfg = SPECIAL_SKILLS[this.equippedSkill];
    this.skillCooldown = cfg.cooldownSec;
    gameAudio.playSkill(this.equippedSkill);
    this.spawnText(this.px, this.py - 50, cfg.name.toUpperCase(), cfg.color, 1.2);

    if (this.equippedSkill === 'tidal_shield') {
      this.shieldTimer = 4.5;
      this.projectiles = this.projectiles.filter((p) => p.fromPlayer);
      this.applyMeleeHit(this.px, this.py, 150, 65, true);
    } else if (this.equippedSkill === 'aether_wings') {
      this.wingsTimer = 4.5;
      for (const vy of [-80, 80]) {
        this.projectiles.push({
          x: this.px + this.pFacing * 24,
          y: this.py,
          vx: this.pFacing * 720,
          vy,
          radius: 14,
          damage: 65,
          fromPlayer: true,
          color: '#FBBF24',
          life: 1.1,
          pierce: true,
          hitIds: new Set(),
        });
      }
    } else if (this.equippedSkill === 'crystal_quake') {
      this.projectiles = this.projectiles.filter((p) => p.fromPlayer);
      this.applyMeleeHit(this.px, this.py, 260, 140, true);
      this.spawnBurst(this.px, this.py, '#E879F9', 26);
      this.triggerShake(0.25, 11);
    } else if (this.equippedSkill === 'chrono_dilation') {
      this.chronoTimer = 5.0;
      this.spawnBurst(this.px, this.py, '#38BDF8', 22);
    } else if (this.equippedSkill === 'astral_supernova') {
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI * 2) / 8;
        this.projectiles.push({
          x: this.px,
          y: this.py,
          vx: Math.cos(ang) * 650,
          vy: Math.sin(ang) * 650,
          radius: 16,
          damage: 110,
          fromPlayer: true,
          color: '#34D399',
          life: 1.2,
          pierce: true,
          hitIds: new Set(),
        });
      }
      this.triggerShake(0.28, 12);
    }
  }

  private updateProjectiles(dt: number) {
    const timeScale = this.chronoTimer > 0 ? 0.4 : 1;
    const next: Projectile[] = [];

    for (const p of this.projectiles) {
      const stepDt = p.fromPlayer ? dt : dt * timeScale;
      p.life -= stepDt;
      if (p.life <= 0) continue;

      if (p.boomerang && p.life < 0.85) {
        p.vx += (this.px - p.x) * 4.2 * stepDt;
        p.vy += (this.py - p.y) * 4.2 * stepDt;
      }

      p.x += p.vx * stepDt;
      p.y += p.vy * stepDt;

      let consumed = false;
      if (p.fromPlayer) {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (p.hitIds?.has(e.id)) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius + e.w * 0.48) {
            p.hitIds?.add(e.id);
            this.damageEnemy(e, p.damage, !!p.explosive || !!p.pierce);
            if (p.explosive) {
              this.applyMeleeHit(p.x, p.y, 110, Math.round(p.damage * 0.7), true);
              this.spawnBurst(p.x, p.y, '#F472B6', 18);
            }
            if (!p.pierce) {
              consumed = true;
              break;
            }
          }
        }
        if (!consumed && this.boss.active && !this.boss.defeated && !p.hitIds?.has(9999)) {
          if (Math.hypot(this.boss.x - p.x, this.boss.y - p.y) < p.radius + this.boss.w * 0.5) {
            p.hitIds?.add(9999);
            this.damageBoss(p.damage, !!p.explosive || !!p.pierce);
            if (!p.pierce) consumed = true;
          }
        }
      } else {
        if (Math.hypot(this.px - p.x, this.py - p.y) < p.radius + 16) {
          this.damagePlayer(p.damage);
          consumed = true;
        }
      }

      if (!consumed) next.push(p);
    }

    this.projectiles = next;
  }

  private updateEnemies(dt: number) {
    const slow = this.chronoTimer > 0 ? 0.4 : 1;
    const ed = dt * slow * (0.85 + (this.difficultyMultiplier - 1) * 0.45);

    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);

      const distToPlayer = Math.hypot(this.px - e.x, this.py - e.y);
      if (distToPlayer > 980) continue;

      e.facing = this.px < e.x ? -1 : 1;

      // Distinct movement behavior per enemy category
      if (e.kind === 'aeroturret' || e.kind === 'astralturret') {
        // Stationary turret
      } else if (e.kind === 'crab' || e.kind === 'golem' || e.kind === 'chronoknight' || e.kind === 'magmaslime') {
        e.x = e.baseX + Math.sin(this.worldTime * 1.6 + e.animSeed) * e.patrolRange;
      } else {
        // Flying / swimming / cosmic hovering movement
        e.x = e.baseX + Math.sin(this.worldTime * 1.4 + e.animSeed) * e.patrolRange;
        e.y = e.baseY + Math.cos(this.worldTime * 2.2 + e.animSeed) * 34;
      }

      // Windup telegraph & attack
      e.fireCooldown -= ed;
      if (e.fireCooldown <= 0.45 && e.fireCooldown > 0) {
        e.telegraphTimer = e.fireCooldown;
      } else {
        e.telegraphTimer = 0;
      }

      if (e.fireCooldown <= 0 && distToPlayer < 640) {
        e.fireCooldown = Math.max(0.85, 2.3 / this.difficultyMultiplier);
        const ang = Math.atan2(this.py - e.y, this.px - e.x);
        const speed = 260 * this.difficultyMultiplier;
        this.projectiles.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          radius: 7,
          damage: 12,
          fromPlayer: false,
          color: '#FB7185',
          life: 2.8,
        });
      }

      // Contact collision
      if (Math.hypot(this.px - e.x, this.py - e.y) < 30) {
        this.damagePlayer(14);
      }
    }
  }

  private updateBoss(dt: number) {
    const b = this.boss;
    if (!b.active) return;
    b.animTime += dt;

    if (b.defeated) {
      b.deathBurstTimer -= dt;
      if (b.deathBurstTimer <= 0) {
        b.deathBurstTimer = 0.18;
        this.spawnBurst(
          b.x + (Math.random() - 0.5) * 140,
          b.y + (Math.random() - 0.5) * 140,
          Math.random() < 0.5 ? '#FDE047' : '#F472B6',
          22
        );
      }
      return;
    }

    if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt);

    const hpPct = b.hp / b.maxHp;
    b.phase = hpPct < 0.45 ? 2 : 1;

    const slow = this.chronoTimer > 0 ? 0.45 : 1;
    const bdt = dt * slow;

    // Dramatic sweeping boss hover motion
    b.x = b.anchorX + Math.sin(b.animTime * (b.phase === 2 ? 1.6 : 1.0)) * 90;
    b.y = b.anchorY + Math.cos(b.animTime * (b.phase === 2 ? 2.1 : 1.3)) * 125;

    // Boss telegraph & attack patterns
    b.attackTimer -= bdt * this.difficultyMultiplier;
    if (b.attackTimer <= 0.55 && b.attackTimer > 0) {
      b.telegraphTimer = b.attackTimer;
    } else {
      b.telegraphTimer = 0;
    }

    if (b.attackTimer <= 0) {
      b.attackTimer = b.phase === 2 ? 1.55 : 2.15;
      b.patternIndex = (b.patternIndex + 1) % 3;
      gameAudio.playBossTelegraph();

      if (b.patternIndex === 0) {
        // Fan barrage aimed at player
        const baseAng = Math.atan2(this.py - b.y, this.px - b.x);
        const count = b.phase === 2 ? 5 : 3;
        for (let i = -(count - 1) / 2; i <= (count - 1) / 2; i++) {
          const ang = baseAng + i * 0.24;
          this.projectiles.push({
            x: b.x - 40,
            y: b.y,
            vx: Math.cos(ang) * 320 * this.difficultyMultiplier,
            vy: Math.sin(ang) * 320 * this.difficultyMultiplier,
            radius: 10,
            damage: 16,
            fromPlayer: false,
            color: '#F43F5E',
            life: 3.4,
          });
        }
      } else if (b.patternIndex === 1) {
        // Radial 360 cosmic ring
        const spokes = b.phase === 2 ? 12 : 8;
        for (let i = 0; i < spokes; i++) {
          const ang = (i * Math.PI * 2) / spokes + b.animTime;
          this.projectiles.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(ang) * 250,
            vy: Math.sin(ang) * 250,
            radius: 9,
            damage: 15,
            fromPlayer: false,
            color: '#F59E0B',
            life: 3.5,
          });
        }
      } else {
        // Zone 5 Sovereign can even shift player's gravity slightly, others launch heavy orb wave!
        for (let row = -1; row <= 1; row++) {
          this.projectiles.push({
            x: b.x - 60,
            y: b.y + row * 120,
            vx: -340 * this.difficultyMultiplier,
            vy: 0,
            radius: 13,
            damage: 18,
            fromPlayer: false,
            color: '#A855F7',
            life: 3.5,
          });
        }
      }
    }

    if (Math.hypot(this.px - b.x, this.py - b.y) < b.w * 0.45) {
      this.damagePlayer(18);
    }
  }

  private damageEnemy(e: EnemyEntity, amount: number, heavy: boolean) {
    e.hp -= amount;
    e.hitFlash = 0.1;
    if (e.hp <= 0) {
      e.alive = false;
      this.perfScore = Math.min(18, this.perfScore + 1.2);
      const pts = 180 + this.zoneId * 40;
      this.score += pts;
      gameAudio.playEnemyExplode();
      this.spawnBurst(e.x, e.y, '#F472B6', 20);
      this.spawnBurst(e.x, e.y, '#FDE047', 12);
      this.spawnText(e.x, e.y - 16, `+${pts}`, '#FDE047', 1.1);
      // Drop Starlight Coin
      this.gems.push({
        id: this.gems.length + 1,
        x: e.x,
        y: e.y,
        collected: false,
        value: 15 + this.zoneId * 5,
        bobOffset: 0,
        isCoin: true,
      });
      if (heavy) {
        this.hitstopTimer = 0.04;
        this.triggerShake(0.12, 5);
      }
    } else {
      gameAudio.playEnemyHit();
      this.spawnBurst(e.x, e.y, '#FFFFFF', 5);
    }
  }

  private damageBoss(amount: number, heavy: boolean) {
    const b = this.boss;
    if (b.defeated) return;
    b.hp -= amount;
    b.hitFlash = 0.09;
    this.score += 25;

    if (heavy) {
      this.hitstopTimer = 0.035;
      this.triggerShake(0.1, 5);
    }

    if (b.hp <= 0) {
      b.hp = 0;
      b.defeated = true;
      b.deathBurstTimer = 0;
      this.projectiles = [];
      this.score += 2500 * this.zoneId;
      this.runCoins += 80 + this.zoneId * 35;
      gameAudio.playBossExplode();
      this.triggerShake(0.65, 14);
      this.spawnBurst(b.x, b.y, '#FDE047', 45);
      this.spawnText(b.x, b.y - 60, `${ZONES[this.zoneId].bossName.toUpperCase()} DEFEATED!`, '#34D399', 1.5);
    } else {
      gameAudio.playEnemyHit();
      this.spawnBurst(b.x + (Math.random() - 0.5) * 60, b.y + (Math.random() - 0.5) * 60, '#FDE047', 6);
    }
  }

  private damagePlayer(amount: number) {
    if (this.pInvuln > 0) return;
    if (this.shieldTimer > 0) {
      this.pInvuln = 0.35;
      gameAudio.playDeflect();
      this.spawnBurst(this.px, this.py, '#22D3EE', 12);
      return;
    }

    if (this.profile.infiniteLife) {
      // Infinite life mode: player never dies, playful bounce spark only!
      this.pInvuln = 0.7;
      this.pHitFlash = 0.14;
      this.pvy = (this.gravityFactor < 0 ? 1 : -1) * 180;
      gameAudio.playPlayerHurt(true);
      this.spawnBurst(this.px, this.py, '#38BDF8', 10);
      this.spawnText(this.px, this.py - 36, 'SHIELD GUARD', '#38BDF8', 0.95);
      return;
    }

    this.pHp = Math.max(0, this.pHp - amount);
    this.pInvuln = 1.1;
    this.pHitFlash = 0.16;
    this.perfScore = Math.max(0, this.perfScore - 2.5);
    gameAudio.playPlayerHurt(false);
    this.triggerShake(0.18, 8);
    this.spawnBurst(this.px, this.py, '#F43F5E', 14);

    if (this.pHp <= 0) {
      this.running = false;
      gameAudio.stopMusic();
      this.callbacks.onGameOver(this.getHudSnapshot());
    }
  }

  private triggerShake(duration: number, intensity: number) {
    this.shakeTimer = Math.max(this.shakeTimer, duration);
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  private spawnBurst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 240;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 3 + Math.random() * 4.5,
        color,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        gravityScale: 0.4,
      });
    }
  }

  private spawnText(x: number, y: number, text: string, color: string, scale = 1) {
    this.floatingTexts.push({ x, y, vy: -48, text, color, life: 0.95, scale });
  }

  private updateParticles(dt: number) {
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 380 * p.gravityScale * dt;
      return true;
    });
    this.floatingTexts = this.floatingTexts.filter((t) => {
      t.life -= dt;
      t.y += t.vy * dt;
      return t.life > 0;
    });
  }

  private render() {
    const ctx = this.ctx;
    const scale = this.canvas.height / this.viewH;

    ctx.save();
    ctx.scale(scale, scale);

    // Camera shake
    let sx = 0;
    let sy = 0;
    if (this.shakeTimer > 0) {
      sx = (Math.random() - 0.5) * this.shakeIntensity;
      sy = (Math.random() - 0.5) * this.shakeIntensity;
    }

    drawZoneBackground(ctx, this.zoneId, this.camX, this.viewW, this.viewH, this.worldTime);

    ctx.save();
    ctx.translate(-this.camX + sx, sy);

    // Environmental Zones (Bubble currents, Wind jets, Gravity Wells)
    for (const ez of this.envZones) {
      if (ez.x + ez.w < this.camX - 80 || ez.x > this.camX + this.viewW + 80) continue;
      if (ez.kind === 'bubble_up' || ez.kind === 'wind_up') {
        const col = ez.kind === 'wind_up' ? 'rgba(251, 191, 36, 0.16)' : 'rgba(34, 211, 238, 0.16)';
        ctx.fillStyle = col;
        ctx.fillRect(ez.x, ez.y, ez.w, ez.h);
        ctx.strokeStyle = ez.kind === 'wind_up' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(103, 232, 249, 0.45)';
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(ez.x, ez.y, ez.w, ez.h);
        ctx.setLineDash([]);
      } else {
        const cx = ez.x + ez.w / 2;
        const cy = ez.y + ez.h / 2;
        const rad = ctx.createRadialGradient(cx, cy, 8, cx, cy, ez.w * 0.55);
        rad.addColorStop(0, 'rgba(168, 85, 247, 0.42)');
        rad.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(cx, cy, ez.w * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Platforms
    const zone = ZONES[this.zoneId];
    for (const plat of this.platforms) {
      if (plat.x + plat.w < this.camX - 60 || plat.x > this.camX + this.viewW + 60) continue;
      if (plat.hazard === 'magma') {
        ctx.fillStyle = '#F97316';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(plat.x, plat.y, plat.w, 4);
      } else {
        ctx.fillStyle = zone.platformColor;
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 8);
        ctx.fill();
        ctx.fillStyle = zone.platformTrim;
        ctx.fillRect(plat.x + 2, plat.isCeiling ? plat.y + plat.h - 5 : plat.y, plat.w - 4, 5);
      }
    }

    // Gems & Coins
    for (const gem of this.gems) {
      if (gem.collected) continue;
      if (gem.x < this.camX - 40 || gem.x > this.camX + this.viewW + 40) continue;
      const by = gem.y + Math.sin(this.worldTime * 4 + gem.bobOffset) * 5;
      if (gem.isCoin) {
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(gem.x, by, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.save();
        ctx.translate(gem.x, by);
        ctx.rotate(this.worldTime * 2 + gem.bobOffset);
        ctx.fillStyle = this.shiftCombo > 0 ? '#FDE047' : '#38BDF8';
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(9, 0);
        ctx.lineTo(0, 11);
        ctx.lineTo(-9, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.x < this.camX - 80 || e.x > this.camX + this.viewW + 80) continue;
      drawEnemySprite(ctx, e, this.worldTime);
    }

    // Colossal Boss
    drawColossalBoss(ctx, this.boss);

    // Player Character
    drawPlayerCharacter(ctx, {
      x: this.px,
      y: this.py,
      vx: this.pvx,
      vy: this.pvy,
      facing: this.pFacing,
      grounded: this.pGrounded,
      gravityPreset: this.gravityPreset,
      flipAngle: this.pFlipAngle,
      scaleX: this.pScaleX,
      scaleY: this.pScaleY,
      animTime: this.worldTime,
      hitFlash: this.pHitFlash,
      invulnTimer: this.pInvuln,
      shieldActive: this.shieldTimer > 0,
      wingsActive: this.wingsTimer > 0,
      weapon: this.weapon,
      attackTimer: this.attackAnimTimer,
      comboStep: this.comboStep,
      equippedOutfit: this.profile.equippedOutfit,
      equippedGlasses: this.profile.equippedGlasses,
      equippedHair: this.profile.equippedHair,
      equippedAura: this.profile.equippedAura,
      activeSkillEffect: null,
    });

    // Projectiles
    for (const p of this.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particles
    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floating Score Texts
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.min(1, ft.life * 1.4);
      ctx.font = `700 ${Math.round(15 * ft.scale)}px "Outfit", sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
    ctx.restore();
  }

  public getHudSnapshot(): HudSnapshot {
    const zone = ZONES[this.zoneId];
    const progressPct = Math.min(100, Math.max(0, Math.round((this.px / (zone.levelLength - 520)) * 100)));
    const skillCfg = this.equippedSkill ? SPECIAL_SKILLS[this.equippedSkill] : null;
    return {
      score: this.score,
      hp: this.pHp,
      maxHp: this.pMaxHp,
      infiniteLife: this.profile.infiniteLife,
      gravityPreset: this.gravityPreset,
      gravityMultiplier: this.gravityFactor,
      shiftCombo: this.shiftCombo,
      shiftTimer: this.shiftTimer,
      weapon: this.weapon,
      comboStep: this.comboStep,
      comboTimer: this.comboResetTimer,
      equippedSkill: this.equippedSkill,
      skillCooldown: this.skillCooldown,
      skillMaxCooldown: skillCfg ? skillCfg.cooldownSec : 1,
      difficultyMultiplier: Number(this.difficultyMultiplier.toFixed(2)),
      zoneId: this.zoneId,
      progressPct,
      bossActive: this.boss.active && !this.boss.defeated,
      bossName: zone.bossName,
      bossHp: this.boss.hp,
      bossMaxHp: this.boss.maxHp,
      bossPhase: this.boss.phase,
      runCoins: this.runCoins,
      runInvertedGems: this.runInvertedGems,
      runComboFinishers: this.runComboFinishers,
      runMidAirShifts: this.runMidAirShifts,
      runShiftScore: this.runShiftScore,
    };
  }
}
