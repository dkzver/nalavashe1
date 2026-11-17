import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { Obstacles } from './Obstacles.js';
import { Collectibles } from './Collectibles.js';
import { CollisionSystem } from './Collision.js';
import { Controls } from './Controls.js';

export const GAME_STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
};

const MAX_PARTICLES = 48;
const _tmpVec = new THREE.Vector3();

function detectSoftwareWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class Game {
  /**
   * @param {{
   *   container: HTMLElement,
   *   audio: import('./Audio.js').SoundManager,
   *   ui: import('./UI.js').UI
   * }} options
   */
  constructor({ container, audio, ui }) {
    this.container = container;
    this.audio = audio;
    this.ui = ui;

    this.state = GAME_STATES.MENU;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.disposed = false;
    this.frameId = 0;

    // Gameplay metrics
    this.score = 0;
    this.distance = 0;
    this.itemsCollected = 0;
    this.baseSpeed = 14.5;
    this.maxSpeed = 30.5;
    this.speed = this.baseSpeed;
    this.shakeTime = 0;

    // Reused scratch arrays
    this.pickedBuffer = [];
    this.particles = [];

    this._initRendererAndScene();
    this._initLighting();
    this._initModules();
    this._initParticles();
    this._bindLifecycleEvents();

    // Warm up shaders on GPU devices
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.clock = new THREE.Clock();
    this._tick = this._loop.bind(this);
    this._scheduleNextFrame();
  }

  _initRendererAndScene() {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const skyColor = 0x9ad4f5;
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.FogExp2(skyColor, 0.0072);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 240);
    this.camera.position.set(2.1, 2.2, 3.0);
    this.camera.lookAt(0.35, 1.0, -1.5);
  }

  _initLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xcbeeff, 0x70563c, 0.78);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.65);
    this.sunLight.position.set(16, 26, 14);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 90;
    const d = 22;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
  }

  _initModules() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.player = new Player(this.scene, maxAniso);
    this.world = new World(this.scene, maxAniso);
    this.obstacles = new Obstacles(this.scene);
    this.collectibles = new Collectibles(this.scene);
    this.collision = new CollisionSystem();

    this.controls = new Controls(this.container, {
      onLeft: () => {
        if (this.state === GAME_STATES.PLAYING && this.player.moveLeft()) {
          this.audio.playLane();
        }
      },
      onRight: () => {
        if (this.state === GAME_STATES.PLAYING && this.player.moveRight()) {
          this.audio.playLane();
        }
      },
      onJump: () => {
        if (this.state === GAME_STATES.PLAYING) {
          const jumped = this.player.jump();
          if (jumped) this.audio.playJump();
        }
      },
      onSlide: () => {
        if (this.state === GAME_STATES.PLAYING) {
          this.player.slide();
          this.audio.playSlide();
        }
      },
      onPauseToggle: () => {
        if (this.state === GAME_STATES.PLAYING) {
          this.pause();
        } else if (this.state === GAME_STATES.PAUSED) {
          this.resume();
        }
      },
    });
  }

  _initParticles() {
    this.particleGeo = new THREE.OctahedronGeometry(0.11, 0);
    this.particleMats = {
      gold: new THREE.MeshBasicMaterial({ color: 0xffb300 }),
      orange: new THREE.MeshBasicMaterial({ color: 0xff5722 }),
      green: new THREE.MeshBasicMaterial({ color: 0x2ebd59 }),
      crash: new THREE.MeshBasicMaterial({ color: 0xff3322 }),
    };

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, this.particleMats.gold);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.45,
        active: false,
      });
    }
  }

  _spawnBurst(x, y, z, matKey, count = 10) {
    const mat = this.particleMats[matKey] || this.particleMats.gold;
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      p.active = true;
      p.life = 0.45;
      p.maxLife = 0.45;
      p.mesh.material = mat;
      p.mesh.visible = true;
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(1);
      p.vx = (Math.random() - 0.5) * 6.5;
      p.vy = 2.0 + Math.random() * 5.0;
      p.vz = (Math.random() - 0.5) * 6.5;
      spawned++;
    }
  }

  _updateParticles(dt) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 8;
      p.mesh.rotation.y += dt * 8;
      const ratio = p.life / p.maxLife;
      p.mesh.scale.setScalar(ratio);
    }
  }

  _bindLifecycleEvents() {
    this._onResize = () => {
      if (this.disposed) return;
      const width = Math.max(1, this.container.clientWidth || window.innerWidth);
      const height = Math.max(1, this.container.clientHeight || window.innerHeight);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    };

    this._onContextLost = (e) => {
      e.preventDefault();
      if (this.state === GAME_STATES.PLAYING) {
        this.pause();
      }
    };

    this._onVisibilityChange = () => {
      if (document.hidden && this.state === GAME_STATES.PLAYING) {
        this.pause();
      }
    };

    window.addEventListener('resize', this._onResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this._onContextLost);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  start() {
    this.score = 0;
    this.distance = 0;
    this.itemsCollected = 0;
    this.speed = this.baseSpeed;
    this.shakeTime = 0;

    this.player.reset();
    this.world.reset();
    this.obstacles.reset();
    this.collectibles.reset();

    // Reset particles
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this.particles[i].mesh.visible = false;
    }

    // Snap camera behind player
    this.camera.position.set(0, 3.6, 6.4);
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(0, 1.35, -7);

    this.state = GAME_STATES.PLAYING;
    this.controls.setEnabled(true);
    this.ui.updateHUD(0, 0, 0);
    this.ui.showScreen('hud');
    this.audio.startMusic();
    this.clock.getDelta();
  }

  pause() {
    if (this.state !== GAME_STATES.PLAYING) return;
    this.state = GAME_STATES.PAUSED;
    this.controls.setEnabled(false);
    this.ui.showScreen('pause');
  }

  resume() {
    if (this.state !== GAME_STATES.PAUSED) return;
    this.state = GAME_STATES.PLAYING;
    this.controls.setEnabled(true);
    this.ui.showScreen('hud');
    this.clock.getDelta();
  }

  returnToMenu() {
    this.state = GAME_STATES.MENU;
    this.controls.setEnabled(false);
    this.audio.stopMusic();
    this.player.reset();
    this.world.reset();
    this.obstacles.reset();
    this.collectibles.reset();
    this.ui.showScreen('menu');
  }

  _triggerGameOver() {
    this.state = GAME_STATES.GAMEOVER;
    this.controls.setEnabled(false);
    this.shakeTime = 0.35;
    this.audio.stopMusic();
    this.audio.playCrash();
    this._spawnBurst(this.player.x, this.player.y + 0.9, this.player.z, 'crash', 20);

    this.ui.showGameOver({
      score: this.score,
      distance: this.distance,
      items: this.itemsCollected,
    });
  }

  _scheduleNextFrame() {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      const gl = this.renderer.getContext();
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (this.disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            this.frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            this.frameId = window.setTimeout(this._tick, 80);
          }
        };
        this.frameId = window.setTimeout(poll, 5);
      } else {
        this.frameId = window.setTimeout(this._tick, 80);
      }
    } else {
      this.frameId = window.requestAnimationFrame(this._tick);
    }
  }

  _loop() {
    if (this.disposed) return;
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const elapsed = this.clock.elapsedTime;

    if (this.state === GAME_STATES.MENU) {
      this.player.updateMenuIdle(dt, elapsed);
      const targetCamX = 1.9 + Math.sin(elapsed * 0.45) * 0.25;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 4, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 2.15, 4, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, 2.7, 4, dt);
      this.camera.lookAt(0.3, 1.05, -1.6);

      this.sunLight.position.set(16, 26, 14);
      this.sunLight.target.position.set(0, 0, -4);
    } else if (this.state === GAME_STATES.PLAYING) {
      // Gradual speed progression designed for ~2-3 minute runs
      const speedProgress = Math.min(1, this.distance / 2800);
      this.speed = THREE.MathUtils.lerp(this.baseSpeed, this.maxSpeed, speedProgress);

      const prevZ = this.player.z;
      this.player.update(dt, this.speed);
      const dz = prevZ - this.player.z;
      this.distance += dz;
      this.score += dz * 10;

      // Update world & waves
      this.world.update(this.player.z);
      const waves = this.obstacles.update(this.player.z, this.distance, this.speed);
      for (let i = 0; i < waves.length; i++) {
        this.collectibles.spawnForWave(waves[i]);
      }
      this.collectibles.update(dt, this.player.z);

      // Deterministic collision checks
      this.collision.updatePlayerBounds(this.player.bounds);

      this.collision.checkCollectibles(this.collectibles.activeList, this.pickedBuffer);
      for (let i = 0; i < this.pickedBuffer.length; i++) {
        const item = this.pickedBuffer[i];
        this.score += item.spec.points;
        this.itemsCollected += 1;

        const burstKey =
          item.spec.id === 'special'
            ? 'orange'
            : item.spec.id === 'drink'
              ? 'green'
              : 'gold';
        this._spawnBurst(
          item.group.position.x,
          item.group.position.y,
          item.group.position.z,
          burstKey,
          item.spec.id === 'special' ? 18 : 10
        );

        if (item.spec.id === 'special') {
          this.audio.playSpecial();
        } else {
          this.audio.playCollect();
        }

        this.ui.spawnFloatingScore(item.spec.label, item.spec.color);
        this.collectibles.consume(item);
      }

      const hit = this.collision.checkObstacles(this.obstacles.activeList);
      if (hit) {
        this._triggerGameOver();
      } else {
        this.ui.updateHUD(this.score, this.distance, this.itemsCollected);
      }

      // Smooth third-person chase camera + speed FOV
      const targetCamX = this.player.x * 0.48;
      const targetCamY = 3.55 + this.player.y * 0.38;
      const targetCamZ = this.player.z + 6.45;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 10, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 9, dt);
      this.camera.position.z = targetCamZ;

      const targetFov = THREE.MathUtils.lerp(60, 68, (this.speed - this.baseSpeed) / (this.maxSpeed - this.baseSpeed));
      if (Math.abs(this.camera.fov - targetFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
        this.camera.updateProjectionMatrix();
      }

      _tmpVec.set(this.player.x * 0.35, 1.35 + this.player.y * 0.2, this.player.z - 8.5);
      this.camera.lookAt(_tmpVec);

      // Follow shadow frustum with player
      this.sunLight.position.set(16, 26, this.player.z + 12);
      this.sunLight.target.position.set(0, 0, this.player.z - 12);
    } else if (this.state === GAME_STATES.GAMEOVER) {
      if (this.shakeTime > 0) {
        this.shakeTime -= dt;
        const mag = this.shakeTime * 0.65;
        this.camera.position.x += (Math.random() - 0.5) * mag;
        this.camera.position.y += (Math.random() - 0.5) * mag;
      }
    }

    this._updateParticles(dt);
    this.renderer.render(this.scene, this.camera);
    this._scheduleNextFrame();
  }

  dispose() {
    this.disposed = true;
    window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);

    window.removeEventListener('resize', this._onResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this._onContextLost);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);

    this.controls.dispose();
    this.player.dispose();
    this.world.dispose();
    this.obstacles.dispose();
    this.collectibles.dispose();

    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particleGeo.dispose();
    Object.values(this.particleMats).forEach((m) => m.dispose());
    this.envTexture.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
