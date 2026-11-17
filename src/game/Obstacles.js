import * as THREE from 'three';
import { LANE_POSITIONS } from './Player.js';

export const OBSTACLE_TYPES = {
  CONE: 'cone',
  BARRIER: 'barrier',
  OVERHEAD: 'overhead',
  CAR: 'car',
  DUMPSTER: 'dumpster',
};

const POOL_SIZE_PER_TYPE = 8;

export class Obstacles {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.disposables = [];
    this.pool = [];
    this.activeList = [];
    this.nextSpawnZ = -34;

    this._initMaterialsAndGeos();
    this._initPool();
  }

  _track(res) {
    this.disposables.push(res);
    return res;
  }

  _initMaterialsAndGeos() {
    this.mats = {
      orange: this._track(new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.42, metalness: 0.05 })),
      white: this._track(new THREE.MeshStandardMaterial({ color: 0xf9f6f0, roughness: 0.45, metalness: 0.05 })),
      darkRubber: this._track(new THREE.MeshStandardMaterial({ color: 0x222020, roughness: 0.85, metalness: 0.05 })),
      red: this._track(new THREE.MeshStandardMaterial({ color: 0xe32d22, roughness: 0.38, metalness: 0.08 })),
      amberGlow: this._track(new THREE.MeshStandardMaterial({ color: 0xffc107, emissive: 0xff9800, emissiveIntensity: 0.8, roughness: 0.2 })),
      metal: this._track(new THREE.MeshStandardMaterial({ color: 0x5c6470, roughness: 0.42, metalness: 0.65 })),
      dumpsterGreen: this._track(new THREE.MeshStandardMaterial({ color: 0x2c7a47, roughness: 0.65, metalness: 0.15 })),
      carBlue: this._track(new THREE.MeshStandardMaterial({ color: 0x2b7de9, roughness: 0.28, metalness: 0.35 })),
      carYellow: this._track(new THREE.MeshStandardMaterial({ color: 0xf4a825, roughness: 0.28, metalness: 0.35 })),
      carRed: this._track(new THREE.MeshStandardMaterial({ color: 0xd93829, roughness: 0.28, metalness: 0.35 })),
      glass: this._track(new THREE.MeshStandardMaterial({ color: 0x1e2c38, roughness: 0.12, metalness: 0.7 })),
      headlight: this._track(new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffe066, emissiveIntensity: 1.1 })),
      taillight: this._track(new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1111, emissiveIntensity: 0.9 })),
    };

    // Cone geos
    this.coneBaseGeo = this._track(new THREE.BoxGeometry(0.85, 0.1, 0.85));
    this.coneBodyGeo = this._track(new THREE.ConeGeometry(0.32, 0.85, 14));
    this.coneBandGeo = this._track(new THREE.CylinderGeometry(0.17, 0.23, 0.2, 14));

    // Barrier geos
    this.barrierBoardGeo = this._track(new THREE.BoxGeometry(1.95, 0.42, 0.22));
    this.barrierStripeGeo = this._track(new THREE.BoxGeometry(0.32, 0.43, 0.24));
    this.barrierLegGeo = this._track(new THREE.BoxGeometry(0.16, 0.95, 0.16));
    this.barrierFootGeo = this._track(new THREE.BoxGeometry(0.24, 0.1, 0.68));
    this.beaconGeo = this._track(new THREE.SphereGeometry(0.1, 10, 8));

    // Overhead slide gate geos
    this.gatePostGeo = this._track(new THREE.CylinderGeometry(0.1, 0.12, 2.55, 10));
    this.gateCrossGeo = this._track(new THREE.BoxGeometry(2.3, 0.75, 0.28));
    this.gateStripeGeo = this._track(new THREE.BoxGeometry(0.35, 0.77, 0.3));

    // Car geos
    this.carChassisGeo = this._track(new THREE.BoxGeometry(1.85, 0.75, 3.7));
    this.carCabinGeo = this._track(new THREE.BoxGeometry(1.56, 0.65, 1.95));
    this.carGlassGeo = this._track(new THREE.BoxGeometry(1.6, 0.48, 1.72));
    this.carWheelGeo = this._track(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14));
    this.carRimGeo = this._track(new THREE.CylinderGeometry(0.19, 0.19, 0.28, 10));
    this.carLightGeo = this._track(new THREE.BoxGeometry(0.34, 0.18, 0.08));

    // Dumpster geos
    this.dumpBodyGeo = this._track(new THREE.BoxGeometry(1.88, 1.18, 2.0));
    this.dumpLidGeo = this._track(new THREE.BoxGeometry(1.96, 0.16, 2.08));
    this.dumpRibGeo = this._track(new THREE.BoxGeometry(1.96, 0.12, 0.14));
    this.dumpWheelGeo = this._track(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 10));
  }

  _buildMesh(type, variant = 0) {
    const group = new THREE.Group();

    if (type === OBSTACLE_TYPES.CONE) {
      const base = new THREE.Mesh(this.coneBaseGeo, this.mats.darkRubber);
      base.position.y = 0.05;
      base.castShadow = true;

      const body = new THREE.Mesh(this.coneBodyGeo, this.mats.orange);
      body.position.y = 0.52;
      body.castShadow = true;

      const band = new THREE.Mesh(this.coneBandGeo, this.mats.white);
      band.position.y = 0.56;

      group.add(base, body, band);
      return { group, width: 0.72, minY: 0, maxY: 0.92, depth: 0.72 };
    }

    if (type === OBSTACLE_TYPES.BARRIER) {
      const board = new THREE.Mesh(this.barrierBoardGeo, this.mats.white);
      board.position.y = 0.76;
      board.castShadow = true;
      group.add(board);

      [-0.65, 0, 0.65].forEach((sx) => {
        const stripe = new THREE.Mesh(this.barrierStripeGeo, this.mats.red);
        stripe.position.set(sx, 0.76, 0);
        group.add(stripe);
      });

      [-0.78, 0.78].forEach((lx) => {
        const leg = new THREE.Mesh(this.barrierLegGeo, this.mats.metal);
        leg.position.set(lx, 0.475, 0);
        leg.castShadow = true;

        const foot = new THREE.Mesh(this.barrierFootGeo, this.mats.darkRubber);
        foot.position.set(lx, 0.05, 0);

        const beacon = new THREE.Mesh(this.beaconGeo, this.mats.amberGlow);
        beacon.position.set(lx, 1.03, 0);

        group.add(leg, foot, beacon);
      });

      return { group, width: 1.85, minY: 0, maxY: 1.0, depth: 0.55 };
    }

    if (type === OBSTACLE_TYPES.OVERHEAD) {
      [-1.02, 1.02].forEach((px) => {
        const post = new THREE.Mesh(this.gatePostGeo, this.mats.metal);
        post.position.set(px, 1.275, 0);
        post.castShadow = true;
        const foot = new THREE.Mesh(this.barrierFootGeo, this.mats.darkRubber);
        foot.position.set(px, 0.05, 0);
        group.add(post, foot);
      });

      const cross = new THREE.Mesh(this.gateCrossGeo, this.mats.orange);
      cross.position.y = 1.65;
      cross.castShadow = true;
      group.add(cross);

      [-0.7, 0, 0.7].forEach((sx) => {
        const stripe = new THREE.Mesh(this.gateStripeGeo, this.mats.white);
        stripe.position.set(sx, 1.65, 0);
        group.add(stripe);
      });

      // Elevated hitbox so player can slide underneath!
      return { group, width: 1.9, minY: 1.12, maxY: 2.35, depth: 0.45 };
    }

    if (type === OBSTACLE_TYPES.CAR) {
      const carColors = [this.mats.carBlue, this.mats.carYellow, this.mats.carRed];
      const paintMat = carColors[variant % carColors.length];

      const chassis = new THREE.Mesh(this.carChassisGeo, paintMat);
      chassis.position.y = 0.68;
      chassis.castShadow = true;
      chassis.receiveShadow = true;

      const cabin = new THREE.Mesh(this.carCabinGeo, paintMat);
      cabin.position.set(0, 1.32, 0.12);
      cabin.castShadow = true;

      const glass = new THREE.Mesh(this.carGlassGeo, this.mats.glass);
      glass.position.set(0, 1.32, 0.12);

      group.add(chassis, cabin, glass);

      // Wheels
      const wheelCoords = [
        [-0.92, 0.36, -1.15],
        [0.92, 0.36, -1.15],
        [-0.92, 0.36, 1.15],
        [0.92, 0.36, 1.15],
      ];
      wheelCoords.forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(this.carWheelGeo, this.mats.darkRubber);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, wy, wz);
        wheel.castShadow = true;

        const rim = new THREE.Mesh(this.carRimGeo, this.mats.white);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(wx, wy, wz);
        group.add(wheel, rim);
      });

      // Headlights (+Z facing player since oncoming traffic or parked) & taillights
      [-0.62, 0.62].forEach((lx) => {
        const tail = new THREE.Mesh(this.carLightGeo, this.mats.taillight);
        tail.position.set(lx, 0.72, 1.87);
        const head = new THREE.Mesh(this.carLightGeo, this.mats.headlight);
        head.position.set(lx, 0.72, -1.87);
        group.add(tail, head);
      });

      return { group, width: 1.75, minY: 0, maxY: 1.66, depth: 3.45 };
    }

    // DUMPSTER
    const body = new THREE.Mesh(this.dumpBodyGeo, this.mats.dumpsterGreen);
    body.position.y = 0.76;
    body.castShadow = true;
    body.receiveShadow = true;

    const lid = new THREE.Mesh(this.dumpLidGeo, this.mats.darkRubber);
    lid.position.y = 1.42;
    lid.castShadow = true;

    const rib = new THREE.Mesh(this.dumpRibGeo, this.mats.metal);
    rib.position.set(0, 0.95, 0.95);

    group.add(body, lid, rib);

    [
      [-0.72, 0.14, -0.75],
      [0.72, 0.14, -0.75],
      [-0.72, 0.14, 0.75],
      [0.72, 0.14, 0.75],
    ].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(this.dumpWheelGeo, this.mats.darkRubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
    });

    return { group, width: 1.75, minY: 0, maxY: 1.48, depth: 1.88 };
  }

  _initPool() {
    const types = Object.values(OBSTACLE_TYPES);
    types.forEach((type) => {
      for (let i = 0; i < POOL_SIZE_PER_TYPE; i++) {
        const built = this._buildMesh(type, i);
        built.group.visible = false;
        this.scene.add(built.group);
        this.pool.push({
          type,
          group: built.group,
          width: built.width,
          minY: built.minY,
          maxY: built.maxY,
          depth: built.depth,
          active: false,
          hitbox: {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0,
            minZ: 0,
            maxZ: 0,
          },
        });
      }
    });
  }

  _acquire(type) {
    for (let i = 0; i < this.pool.length; i++) {
      const item = this.pool[i];
      if (!item.active && item.type === type) {
        item.active = true;
        item.group.visible = true;
        this.activeList.push(item);
        return item;
      }
    }
    return null;
  }

  _releaseAt(index) {
    const item = this.activeList[index];
    item.active = false;
    item.group.visible = false;
    this.activeList.splice(index, 1);
  }

  reset() {
    for (let i = this.activeList.length - 1; i >= 0; i--) {
      this._releaseAt(i);
    }
    this.nextSpawnZ = -34;
  }

  /**
   * Spawns waves ahead of the player and recycles passed obstacles.
   * Returns any newly spawned wave descriptor so Collectibles can place rewards fairly.
   * @param {number} playerZ
   * @param {number} distanceMeters
   * @param {number} speed
   * @returns {Array}
   */
  update(playerZ, distanceMeters, speed) {
    // Recycle obstacles behind camera
    for (let i = this.activeList.length - 1; i >= 0; i--) {
      if (this.activeList[i].group.position.z > playerZ + 18) {
        this._releaseAt(i);
      }
    }

    const spawnedWaves = [];
    const horizonZ = playerZ - 118;

    while (this.nextSpawnZ > horizonZ) {
      const wave = this._spawnWave(this.nextSpawnZ, distanceMeters);
      spawnedWaves.push(wave);

      // Gap scales gently with speed while remaining exciting
      const difficulty = Math.min(1, distanceMeters / 2200);
      const minGap = THREE.MathUtils.lerp(21, 14.5, difficulty) + (speed - 14) * 0.28;
      const maxGap = minGap + 6.5;
      this.nextSpawnZ -= THREE.MathUtils.randFloat(minGap, maxGap);
    }

    return spawnedWaves;
  }

  _spawnWave(zPos, distanceMeters) {
    const difficulty = Math.min(1, distanceMeters / 1800);
    const lanes = [0, 1, 2];

    // Shuffle lane order
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = lanes[i];
      lanes[i] = lanes[j];
      lanes[j] = tmp;
    }

    // Decide how many lanes have obstacles (1 or 2, never 3 hard walls)
    const twoObstacleChance = THREE.MathUtils.lerp(0.28, 0.72, difficulty);
    const count = Math.random() < twoObstacleChance ? 2 : 1;

    const waveInfo = {
      z: zPos,
      lanes: [null, null, null], // null | type
    };

    for (let i = 0; i < count; i++) {
      const lane = lanes[i];
      const type = this._pickObstacleType(difficulty);
      const obs = this._acquire(type);
      if (!obs) continue;

      const x = LANE_POSITIONS[lane];
      obs.group.position.set(x, 0, zPos);

      const hw = obs.width * 0.5;
      const hd = obs.depth * 0.5;
      obs.hitbox.minX = x - hw;
      obs.hitbox.maxX = x + hw;
      obs.hitbox.minY = obs.minY;
      obs.hitbox.maxY = obs.maxY;
      obs.hitbox.minZ = zPos - hd;
      obs.hitbox.maxZ = zPos + hd;

      waveInfo.lanes[lane] = type;
    }

    return waveInfo;
  }

  _pickObstacleType(difficulty) {
    const r = Math.random();
    if (difficulty < 0.2) {
      if (r < 0.45) return OBSTACLE_TYPES.CONE;
      if (r < 0.75) return OBSTACLE_TYPES.BARRIER;
      return OBSTACLE_TYPES.OVERHEAD;
    }
    if (r < 0.24) return OBSTACLE_TYPES.CONE;
    if (r < 0.44) return OBSTACLE_TYPES.BARRIER;
    if (r < 0.64) return OBSTACLE_TYPES.OVERHEAD;
    if (r < 0.84) return OBSTACLE_TYPES.CAR;
    return OBSTACLE_TYPES.DUMPSTER;
  }

  dispose() {
    this.pool.forEach((item) => this.scene.remove(item.group));
    this.pool.length = 0;
    this.activeList.length = 0;
    this.disposables.forEach((d) => {
      if (d && typeof d.dispose === 'function') d.dispose();
    });
    this.disposables.length = 0;
  }
}
