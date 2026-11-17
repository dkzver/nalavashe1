import * as THREE from 'three';
import { LANE_POSITIONS } from './Player.js';
import { OBSTACLE_TYPES } from './Obstacles.js';

export const COLLECTIBLE_TYPES = {
  SHAWARMA: { id: 'shawarma', points: 100, label: '+100 Шаурма', color: '#FFB300' },
  BURGER: { id: 'burger', points: 150, label: '+150 Бургер', color: '#FF7A2F' },
  FRIES: { id: 'fries', points: 120, label: '+120 Картофель фри', color: '#FFD54F' },
  DRINK: { id: 'drink', points: 50, label: '+50 Напиток', color: '#2EBD59' },
  SPECIAL: { id: 'special', points: 500, label: '+500 LAVA-БОНУС!', color: '#FF5722' },
};

const POOL_EACH = 14;

export class Collectibles {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.disposables = [];
    this.pool = [];
    this.activeList = [];
    this.elapsed = 0;

    this._initMaterialsAndGeos();
    this._initPool();
  }

  _track(res) {
    this.disposables.push(res);
    return res;
  }

  _initMaterialsAndGeos() {
    this.mats = {
      lavash: this._track(new THREE.MeshStandardMaterial({ color: 0xeeb458, roughness: 0.65, metalness: 0.04 })),
      wrapRed: this._track(new THREE.MeshStandardMaterial({ color: 0xff5722, roughness: 0.45, metalness: 0.06 })),
      bun: this._track(new THREE.MeshStandardMaterial({ color: 0xe69f45, roughness: 0.6, metalness: 0.02 })),
      patty: this._track(new THREE.MeshStandardMaterial({ color: 0x612b15, roughness: 0.72, metalness: 0.02 })),
      cheese: this._track(new THREE.MeshStandardMaterial({ color: 0xffca28, roughness: 0.35, metalness: 0.05 })),
      lettuce: this._track(new THREE.MeshStandardMaterial({ color: 0x45c452, roughness: 0.5 })),
      tomato: this._track(new THREE.MeshStandardMaterial({ color: 0xe6352b, roughness: 0.3 })),
      fry: this._track(new THREE.MeshStandardMaterial({ color: 0xffd147, roughness: 0.55 })),
      cupWhite: this._track(new THREE.MeshStandardMaterial({ color: 0xf9f5ee, roughness: 0.3 })),
      cupAccent: this._track(new THREE.MeshStandardMaterial({ color: 0x2ebd59, roughness: 0.35 })),
      straw: this._track(new THREE.MeshStandardMaterial({ color: 0xff4518, roughness: 0.3 })),
      gold: this._track(
        new THREE.MeshStandardMaterial({
          color: 0xffc400,
          emissive: 0xff6a00,
          emissiveIntensity: 0.45,
          roughness: 0.2,
          metalness: 0.8,
        })
      ),
      flameGem: this._track(
        new THREE.MeshStandardMaterial({
          color: 0xff4518,
          emissive: 0xff5722,
          emissiveIntensity: 0.7,
          roughness: 0.18,
          metalness: 0.35,
        })
      ),
    };

    this.geos = {
      shawarmaBody: this._track(new THREE.CylinderGeometry(0.2, 0.16, 0.65, 14)),
      shawarmaCuff: this._track(new THREE.CylinderGeometry(0.185, 0.165, 0.28, 14)),
      shawarmaFill: this._track(new THREE.SphereGeometry(0.14, 10, 8)),
      bunBottom: this._track(new THREE.CylinderGeometry(0.28, 0.26, 0.14, 16)),
      bunTop: this._track(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      patty: this._track(new THREE.CylinderGeometry(0.29, 0.29, 0.1, 16)),
      cheese: this._track(new THREE.BoxGeometry(0.46, 0.04, 0.46)),
      friesBox: this._track(new THREE.CylinderGeometry(0.24, 0.16, 0.42, 4)),
      fryStick: this._track(new THREE.BoxGeometry(0.055, 0.38, 0.055)),
      drinkCup: this._track(new THREE.CylinderGeometry(0.22, 0.15, 0.56, 14)),
      drinkLid: this._track(new THREE.SphereGeometry(0.22, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      drinkStraw: this._track(new THREE.CylinderGeometry(0.024, 0.024, 0.34, 8)),
      specialStar: this._track(new THREE.OctahedronGeometry(0.32, 0)),
      specialRing: this._track(new THREE.TorusGeometry(0.42, 0.045, 8, 22)),
    };
  }

  _buildMesh(spec) {
    const group = new THREE.Group();

    if (spec.id === 'shawarma') {
      const tilt = new THREE.Group();
      tilt.rotation.z = -0.25;
      const body = new THREE.Mesh(this.geos.shawarmaBody, this.mats.lavash);
      body.castShadow = true;
      const cuff = new THREE.Mesh(this.geos.shawarmaCuff, this.mats.wrapRed);
      cuff.position.y = -0.15;
      const veg = new THREE.Mesh(this.geos.shawarmaFill, this.mats.lettuce);
      veg.position.set(0.05, 0.33, 0);
      const tom = new THREE.Mesh(this.geos.shawarmaFill, this.mats.tomato);
      tom.scale.setScalar(0.75);
      tom.position.set(-0.06, 0.35, 0.03);
      tilt.add(body, cuff, veg, tom);
      group.add(tilt);
    } else if (spec.id === 'burger') {
      const bot = new THREE.Mesh(this.geos.bunBottom, this.mats.bun);
      bot.position.y = -0.16;
      const patty = new THREE.Mesh(this.geos.patty, this.mats.patty);
      patty.position.y = -0.04;
      const cheese = new THREE.Mesh(this.geos.cheese, this.mats.cheese);
      cheese.rotation.y = 0.4;
      cheese.position.y = 0.03;
      const letSlice = new THREE.Mesh(this.geos.cheese, this.mats.lettuce);
      letSlice.rotation.y = -0.25;
      letSlice.position.y = 0.07;
      const top = new THREE.Mesh(this.geos.bunTop, this.mats.bun);
      top.position.y = 0.09;
      top.castShadow = true;
      group.add(bot, patty, cheese, letSlice, top);
    } else if (spec.id === 'fries') {
      const carton = new THREE.Mesh(this.geos.friesBox, this.mats.wrapRed);
      carton.rotation.y = Math.PI / 4;
      carton.position.y = -0.12;
      carton.castShadow = true;
      group.add(carton);

      for (let i = 0; i < 7; i++) {
        const stick = new THREE.Mesh(this.geos.fryStick, this.mats.fry);
        const angle = (i / 7) * Math.PI * 2;
        stick.position.set(Math.cos(angle) * 0.08, 0.14 + (i % 2) * 0.05, Math.sin(angle) * 0.08);
        stick.rotation.z = (i - 3) * 0.08;
        group.add(stick);
      }
    } else if (spec.id === 'drink') {
      const cup = new THREE.Mesh(this.geos.drinkCup, this.mats.cupAccent);
      cup.castShadow = true;
      const band = new THREE.Mesh(this.geos.drinkCup, this.mats.cupWhite);
      band.scale.set(1.03, 0.35, 1.03);
      band.position.y = 0.06;
      const lid = new THREE.Mesh(this.geos.drinkLid, this.mats.cupWhite);
      lid.position.y = 0.27;
      const straw = new THREE.Mesh(this.geos.drinkStraw, this.mats.straw);
      straw.position.set(0.05, 0.44, 0);
      straw.rotation.z = -0.22;
      group.add(cup, band, lid, straw);
    } else {
      // SPECIAL BONUS
      const gem = new THREE.Mesh(this.geos.specialStar, this.mats.flameGem);
      gem.castShadow = true;
      const ring = new THREE.Mesh(this.geos.specialRing, this.mats.gold);
      ring.rotation.x = 0.5;
      group.add(gem, ring);
    }

    return group;
  }

  _initPool() {
    const specs = Object.values(COLLECTIBLE_TYPES);
    specs.forEach((spec) => {
      const count = spec.id === 'special' ? 5 : POOL_EACH;
      for (let i = 0; i < count; i++) {
        const group = this._buildMesh(spec);
        group.visible = false;
        this.scene.add(group);
        this.pool.push({
          spec,
          group,
          baseY: 0.75,
          phase: Math.random() * Math.PI * 2,
          active: false,
          hitbox: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 },
        });
      }
    });
  }

  _acquire(specId) {
    for (let i = 0; i < this.pool.length; i++) {
      const item = this.pool[i];
      if (!item.active && item.spec.id === specId) {
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

  consume(item) {
    const idx = this.activeList.indexOf(item);
    if (idx !== -1) {
      this._releaseAt(idx);
    }
  }

  reset() {
    for (let i = this.activeList.length - 1; i >= 0; i--) {
      this._releaseAt(i);
    }
  }

  /**
   * Spawns a line or arc of food items aligned to an obstacle wave so paths are fair & rewarding.
   * @param {{ z: number, lanes: Array<string|null> }} waveInfo
   */
  spawnForWave(waveInfo) {
    const { z, lanes } = waveInfo;

    // Pick a free lane or a jumpable/slideable lane
    const candidateLanes = [];
    for (let l = 0; l < 3; l++) {
      if (lanes[l] === null) {
        candidateLanes.push({ lane: l, mode: 'flat' });
      } else if (lanes[l] === OBSTACLE_TYPES.CONE || lanes[l] === OBSTACLE_TYPES.BARRIER) {
        candidateLanes.push({ lane: l, mode: 'arc' });
      } else if (lanes[l] === OBSTACLE_TYPES.OVERHEAD) {
        candidateLanes.push({ lane: l, mode: 'low' });
      }
    }

    if (candidateLanes.length === 0) return;
    const choice = candidateLanes[Math.floor(Math.random() * candidateLanes.length)];
    const x = LANE_POSITIONS[choice.lane];

    if (choice.mode === 'arc') {
      // 3-item jump arc over low obstacle
      const specId = Math.random() < 0.25 ? 'burger' : 'shawarma';
      [-2.2, 0, 2.2].forEach((dz, idx) => {
        const y = idx === 1 ? 1.85 : 1.15;
        this._spawnOne(specId, x, y, z + dz);
      });
    } else if (choice.mode === 'low') {
      // Low item inviting a slide under the overhead gate
      const specId = Math.random() < 0.35 ? 'special' : 'burger';
      this._spawnOne(specId, x, 0.5, z);
    } else {
      // Trail of 3 items in a free lane
      const roll = Math.random();
      let specId = 'shawarma';
      if (roll < 0.26) specId = 'drink';
      else if (roll < 0.52) specId = 'fries';
      else if (roll < 0.78) specId = 'shawarma';
      else if (roll < 0.93) specId = 'burger';
      else specId = 'special';

      if (specId === 'special') {
        this._spawnOne('special', x, 0.85, z);
      } else {
        [-3.0, 0, 3.0].forEach((dz) => {
          this._spawnOne(specId, x, 0.72, z + dz);
        });
      }
    }
  }

  _spawnOne(specId, x, y, z) {
    const item = this._acquire(specId);
    if (!item) return;

    item.baseY = y;
    item.group.position.set(x, y, z);

    const r = 0.36;
    item.hitbox.minX = x - r;
    item.hitbox.maxX = x + r;
    item.hitbox.minY = y - 0.42;
    item.hitbox.maxY = y + 0.42;
    item.hitbox.minZ = z - r;
    item.hitbox.maxZ = z + r;
  }

  update(dt, playerZ) {
    this.elapsed += dt;

    for (let i = this.activeList.length - 1; i >= 0; i--) {
      const item = this.activeList[i];
      if (item.group.position.z > playerZ + 14) {
        this._releaseAt(i);
        continue;
      }

      item.group.rotation.y += dt * (item.spec.id === 'special' ? 3.2 : 2.2);
      item.group.position.y = item.baseY + Math.sin(this.elapsed * 3.8 + item.phase) * 0.1;
    }
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
