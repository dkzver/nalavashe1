import * as THREE from 'three';

const CHUNK_LENGTH = 26;
const NUM_CHUNKS = 8;

function createRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Asphalt base
  ctx.fillStyle = '#2b2d33';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  for (let i = 0; i < 1600; i++) {
    const x = (i * 97) % 512;
    const y = (i * 193) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, y, 3, 3);
  }

  // Outer shoulder warm lines (branded warm amber edge)
  ctx.fillStyle = '#ffb300';
  ctx.fillRect(16, 0, 12, 512);
  ctx.fillRect(484, 0, 12, 512);

  // Dashed lane dividers separating 3 lanes
  ctx.fillStyle = '#f5f0e8';
  const laneX1 = Math.round(512 / 3) - 5;
  const laneX2 = Math.round((512 * 2) / 3) - 5;
  for (let y = 16; y < 512; y += 96) {
    ctx.fillRect(laneX1, y, 10, 54);
    ctx.fillRect(laneX2, y, 10, 54);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  return tex;
}

function createSidewalkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#cfc3b6';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#b4a595';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  return tex;
}

function createBrandSignTexture(subtitle = 'ШАУРМА И БУРГЕРЫ') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1d1411';
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = '#ff5722';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 176);

  ctx.fillStyle = '#ffb300';
  ctx.font = '900 62px Rubik, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('На LAVAше', 256, 78);

  ctx.fillStyle = '#fff9f2';
  ctx.font = '700 26px Rubik, sans-serif';
  ctx.fillText(subtitle, 256, 138);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class World {
  /**
   * @param {THREE.Scene} scene
   * @param {number} maxAnisotropy
   */
  constructor(scene, maxAnisotropy = 4) {
    this.scene = scene;
    this.chunks = [];
    this.disposables = [];

    this._initSharedAssets(maxAnisotropy);
    this._createEndlessGroundBackdrop();
    this._createChunks();
  }

  _track(res) {
    this.disposables.push(res);
    return res;
  }

  _initSharedAssets(maxAnisotropy) {
    const roadTex = this._track(createRoadTexture());
    roadTex.anisotropy = maxAnisotropy;

    const sidewalkTex = this._track(createSidewalkTexture());
    sidewalkTex.anisotropy = maxAnisotropy;

    const signTexA = this._track(createBrandSignTexture('ГОРЯЧАЯ ШАУРМА'));
    signTexA.anisotropy = maxAnisotropy;

    const signTexB = this._track(createBrandSignTexture('ЗАКАЗ НА NALAVASHE-VL.RU'));
    signTexB.anisotropy = maxAnisotropy;

    this.mats = {
      road: this._track(new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85, metalness: 0.05 })),
      sidewalk: this._track(new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.82, metalness: 0.02 })),
      curb: this._track(new THREE.MeshStandardMaterial({ color: 0x9b928a, roughness: 0.78, metalness: 0.05 })),
      ground: this._track(new THREE.MeshStandardMaterial({ color: 0x5c8b4e, roughness: 0.92, metalness: 0 })),
      window: this._track(new THREE.MeshStandardMaterial({ color: 0xa6e3ff, roughness: 0.15, metalness: 0.4, emissive: 0x1e4a63, emissiveIntensity: 0.3 })),
      roof: this._track(new THREE.MeshStandardMaterial({ color: 0x3b3532, roughness: 0.75, metalness: 0.1 })),
      trunk: this._track(new THREE.MeshStandardMaterial({ color: 0x6b442a, roughness: 0.9, metalness: 0 })),
      foliageA: this._track(new THREE.MeshStandardMaterial({ color: 0x38a849, roughness: 0.72, metalness: 0 })),
      foliageB: this._track(new THREE.MeshStandardMaterial({ color: 0x4cc459, roughness: 0.72, metalness: 0 })),
      lampPole: this._track(new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.4, metalness: 0.7 })),
      lampBulb: this._track(new THREE.MeshStandardMaterial({ color: 0xffe89e, emissive: 0xffb300, emissiveIntensity: 1.4, roughness: 0.2 })),
      awningOrange: this._track(new THREE.MeshStandardMaterial({ color: 0xff5722, roughness: 0.55, metalness: 0.04 })),
      awningGold: this._track(new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.5, metalness: 0.04 })),
      signA: this._track(new THREE.MeshStandardMaterial({ map: signTexA, roughness: 0.35, metalness: 0.08, emissive: 0xffffff, emissiveMap: signTexA, emissiveIntensity: 0.25 })),
      signB: this._track(new THREE.MeshStandardMaterial({ map: signTexB, roughness: 0.35, metalness: 0.08, emissive: 0xffffff, emissiveMap: signTexB, emissiveIntensity: 0.25 })),
      roadSignRed: this._track(new THREE.MeshStandardMaterial({ color: 0xe63928, roughness: 0.4, metalness: 0.2 })),
      roadSignWhite: this._track(new THREE.MeshStandardMaterial({ color: 0xfbf7f0, roughness: 0.4, metalness: 0.1 })),
    };

    const buildingPalette = [0xf28b50, 0xf6c667, 0x5aa9e6, 0xe86a58, 0x8cc97b, 0xdfd3c3];
    this.buildingMats = buildingPalette.map((hex) =>
      this._track(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.74, metalness: 0.04 }))
    );

    // Shared geometries
    this.geos = {
      road: this._track(new THREE.PlaneGeometry(8.6, CHUNK_LENGTH)),
      sidewalk: this._track(new THREE.BoxGeometry(4.4, 0.2, CHUNK_LENGTH)),
      curb: this._track(new THREE.BoxGeometry(0.28, 0.24, CHUNK_LENGTH)),
      outerGround: this._track(new THREE.PlaneGeometry(110, CHUNK_LENGTH)),
      buildingBox: this._track(new THREE.BoxGeometry(1, 1, 1)),
      windowPane: this._track(new THREE.BoxGeometry(0.95, 1.05, 0.14)),
      awning: this._track(new THREE.BoxGeometry(4.2, 0.32, 1.4)),
      trunk: this._track(new THREE.CylinderGeometry(0.18, 0.26, 2.2, 8)),
      crown: this._track(new THREE.DodecahedronGeometry(1.15, 1)),
      pole: this._track(new THREE.CylinderGeometry(0.08, 0.11, 5.2, 8)),
      lampArm: this._track(new THREE.BoxGeometry(1.4, 0.1, 0.1)),
      lampHead: this._track(new THREE.SphereGeometry(0.24, 10, 8)),
      billboardFrame: this._track(new THREE.BoxGeometry(0.32, 2.2, 5.4)),
      billboardFace: this._track(new THREE.PlaneGeometry(5.0, 1.88)),
      signPost: this._track(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8)),
      signBoard: this._track(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 12)),
    };
  }

  _createEndlessGroundBackdrop() {
    // Distant ground skirt around the road chunks to prevent horizon void
    const farGeo = this._track(new THREE.PlaneGeometry(360, 420));
    this.farGround = new THREE.Mesh(farGeo, this.mats.ground);
    this.farGround.rotation.x = -Math.PI / 2;
    this.farGround.position.set(0, -0.08, -120);
    this.farGround.receiveShadow = true;
    this.scene.add(this.farGround);
  }

  _createChunks() {
    for (let i = 0; i < NUM_CHUNKS; i++) {
      const chunk = this._buildChunk(i);
      chunk.position.z = -i * CHUNK_LENGTH;
      this.scene.add(chunk);
      this.chunks.push(chunk);
    }
  }

  _buildChunk(seedIndex) {
    const chunk = new THREE.Group();

    // 1. 3-Lane Road
    const road = new THREE.Mesh(this.geos.road, this.mats.road);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.receiveShadow = true;
    chunk.add(road);

    // 2. Sidewalks & Curbs
    [-1, 1].forEach((side) => {
      const curb = new THREE.Mesh(this.geos.curb, this.mats.curb);
      curb.position.set(side * 4.44, 0.12, 0);
      curb.receiveShadow = true;
      chunk.add(curb);

      const walk = new THREE.Mesh(this.geos.sidewalk, this.mats.sidewalk);
      walk.position.set(side * 6.75, 0.1, 0);
      walk.receiveShadow = true;
      chunk.add(walk);
    });

    // 3. Buildings on left and right
    [-1, 1].forEach((side, sIdx) => {
      for (let b = 0; b < 2; b++) {
        const zOffset = -6.5 + b * 13;
        const height = 6.5 + ((seedIndex * 3 + b * 5 + sIdx * 2) % 7) * 1.45;
        const width = 5.4 + ((seedIndex + b) % 2) * 0.9;
        const depth = 9.4;

        const buildingGroup = new THREE.Group();
        buildingGroup.position.set(side * (9.2 + width * 0.5), 0, zOffset);

        const wallMat = this.buildingMats[(seedIndex + b + sIdx * 2) % this.buildingMats.length];
        const body = new THREE.Mesh(this.geos.buildingBox, wallMat);
        body.scale.set(width, height, depth);
        body.position.y = height * 0.5;
        body.castShadow = true;
        body.receiveShadow = true;
        buildingGroup.add(body);

        // Roof cap
        const roof = new THREE.Mesh(this.geos.buildingBox, this.mats.roof);
        roof.scale.set(width + 0.35, 0.45, depth + 0.35);
        roof.position.y = height + 0.22;
        buildingGroup.add(roof);

        // Street-facing windows (2 rows/columns)
        const faceX = -side * (width * 0.5 + 0.02);
        const floors = Math.min(4, Math.floor(height / 2.6));
        for (let f = 1; f <= floors; f++) {
          [-2.2, 2.2].forEach((wz) => {
            const win = new THREE.Mesh(this.geos.windowPane, this.mats.window);
            win.rotation.y = Math.PI / 2;
            win.position.set(faceX, f * 2.2 + 0.4, wz);
            buildingGroup.add(win);
          });
        }

        // Ground-floor awning or «На LAVAше» storefront billboard on select buildings
        if ((seedIndex + b + sIdx) % 2 === 0) {
          const awning = new THREE.Mesh(
            this.geos.awning,
            (seedIndex + b) % 2 === 0 ? this.mats.awningOrange : this.mats.awningGold
          );
          awning.rotation.y = Math.PI / 2;
          awning.rotation.z = side * 0.18;
          awning.position.set(-side * (width * 0.5 + 0.6), 2.5, 0);
          awning.castShadow = true;
          buildingGroup.add(awning);
        }

        if ((seedIndex + b) % 3 === 0 && sIdx === (seedIndex % 2)) {
          const signMat = seedIndex % 2 === 0 ? this.mats.signA : this.mats.signB;
          const board = new THREE.Mesh(this.geos.billboardFrame, this.mats.roof);
          board.position.set(-side * (width * 0.5 + 0.35), 4.1, 0);
          const face = new THREE.Mesh(this.geos.billboardFace, signMat);
          face.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          face.position.set(-side * 0.18, 0, 0);
          board.add(face);
          buildingGroup.add(board);
        }

        chunk.add(buildingGroup);
      }

      // 4. Street Lamp
      const lamp = new THREE.Group();
      lamp.position.set(side * 4.85, 0.2, -5.5);
      const pole = new THREE.Mesh(this.geos.pole, this.mats.lampPole);
      pole.position.y = 2.6;
      pole.castShadow = true;
      const arm = new THREE.Mesh(this.geos.lampArm, this.mats.lampPole);
      arm.position.set(-side * 0.65, 5.15, 0);
      const bulb = new THREE.Mesh(this.geos.lampHead, this.mats.lampBulb);
      bulb.position.set(-side * 1.25, 5.02, 0);
      lamp.add(pole, arm, bulb);
      chunk.add(lamp);

      // 5. Stylized Cartoon Trees
      const tree = new THREE.Group();
      tree.position.set(side * 6.4, 0.2, 6.2);
      const trunk = new THREE.Mesh(this.geos.trunk, this.mats.trunk);
      trunk.position.y = 1.1;
      trunk.castShadow = true;
      const crown1 = new THREE.Mesh(this.geos.crown, side > 0 ? this.mats.foliageA : this.mats.foliageB);
      crown1.position.y = 2.85;
      crown1.castShadow = true;
      const crown2 = new THREE.Mesh(this.geos.crown, side > 0 ? this.mats.foliageB : this.mats.foliageA);
      crown2.scale.setScalar(0.75);
      crown2.position.set(side * 0.45, 2.35, 0.3);
      crown2.castShadow = true;
      tree.add(trunk, crown1, crown2);
      chunk.add(tree);

      // 6. Occasional Road Sign
      if ((seedIndex + sIdx) % 2 === 1) {
        const sign = new THREE.Group();
        sign.position.set(side * 4.75, 0.2, 2.2);
        const post = new THREE.Mesh(this.geos.signPost, this.mats.lampPole);
        post.position.y = 1.3;
        const disc = new THREE.Mesh(this.geos.signBoard, this.mats.roadSignRed);
        disc.rotation.x = Math.PI / 2;
        disc.position.y = 2.45;
        const inner = new THREE.Mesh(this.geos.signBoard, this.mats.roadSignWhite);
        inner.scale.set(0.68, 1.2, 0.68);
        inner.rotation.x = Math.PI / 2;
        inner.position.y = 2.45;
        sign.add(post, disc, inner);
        chunk.add(sign);
      }
    });

    return chunk;
  }

  reset() {
    for (let i = 0; i < this.chunks.length; i++) {
      this.chunks[i].position.z = -i * CHUNK_LENGTH;
    }
    if (this.farGround) {
      this.farGround.position.z = -120;
    }
  }

  /**
   * Recycles chunks infinitely ahead of the player.
   * @param {number} playerZ
   */
  update(playerZ) {
    let minZ = Infinity;
    for (let i = 0; i < this.chunks.length; i++) {
      if (this.chunks[i].position.z < minZ) {
        minZ = this.chunks[i].position.z;
      }
    }

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      if (chunk.position.z > playerZ + CHUNK_LENGTH * 1.15) {
        chunk.position.z = minZ - CHUNK_LENGTH;
        minZ = chunk.position.z;
      }
    }

    if (this.farGround) {
      this.farGround.position.z = playerZ - 120;
    }
  }

  dispose() {
    this.chunks.forEach((c) => this.scene.remove(c));
    this.chunks.length = 0;
    if (this.farGround) this.scene.remove(this.farGround);
    this.disposables.forEach((d) => {
      if (d && typeof d.dispose === 'function') d.dispose();
    });
    this.disposables.length = 0;
  }
}
