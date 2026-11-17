import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const LANE_POSITIONS = [-2.6, 0, 2.6];

function createLavashTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Warm toasted lavash base
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#f7c772');
  grad.addColorStop(0.5, '#eab055');
  grad.addColorStop(1, '#df9c41');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle toasted blister spots
  for (let i = 0; i < 65; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    const r = 4 + (i % 7);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(154, 78, 22, 0.22)' : 'rgba(255, 236, 185, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.3, r * 0.85, (i % 5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Diagonal grill marks
  ctx.strokeStyle = 'rgba(128, 56, 12, 0.34)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  for (let offset = -256; offset < 512; offset += 42) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + 140, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(10, 8, 6, 0.52)');
  grad.addColorStop(0.55, 'rgba(10, 8, 6, 0.24)');
  grad.addColorStop(1, 'rgba(10, 8, 6, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Player {
  /**
   * @param {THREE.Scene} scene
   * @param {number} maxAnisotropy
   */
  constructor(scene, maxAnisotropy = 4) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.modelRoot = new THREE.Group();
    this.group.add(this.modelRoot);

    this.disposables = [];
    this.mixer = null;
    this.customModelActions = {};
    this.usingCustomGLB = false;

    // Gameplay state
    this.laneIndex = 1; // 0: left, 1: center, 2: right
    this.x = LANE_POSITIONS[1];
    this.y = 0;
    this.z = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.jumpBufferTimer = 0;
    this.runTime = 0;

    // Animation smoothness
    this.bankAngle = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.squashZ = 1;

    // Reusable bounds object (zero GC)
    this.bounds = {
      x: 0,
      y: 0,
      z: 0,
      width: 0.72,
      height: 1.7,
      depth: 0.72,
    };

    this._buildProceduralShawarmaMascot(maxAnisotropy);
    this._buildContactShadow();

    this.scene.add(this.group);
  }

  _track(resource) {
    this.disposables.push(resource);
    return resource;
  }

  _buildContactShadow() {
    const tex = this._track(createContactShadowTexture());
    const geo = this._track(new THREE.PlaneGeometry(1.5, 1.5));
    const mat = this._track(
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0.65,
      })
    );
    this.contactShadow = new THREE.Mesh(geo, mat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.025;
    this.scene.add(this.contactShadow);
  }

  _buildProceduralShawarmaMascot(maxAnisotropy) {
    const lavashTex = this._track(createLavashTexture());
    lavashTex.anisotropy = maxAnisotropy;

    const lavashMat = this._track(
      new THREE.MeshStandardMaterial({
        map: lavashTex,
        roughness: 0.72,
        metalness: 0.02,
      })
    );
    const wrapperMat = this._track(
      new THREE.MeshStandardMaterial({
        color: 0xff5722,
        roughness: 0.45,
        metalness: 0.05,
      })
    );
    const wrapperStripeMat = this._track(
      new THREE.MeshStandardMaterial({
        color: 0xffb300,
        roughness: 0.35,
        metalness: 0.1,
      })
    );
    const meatMat = this._track(
      new THREE.MeshStandardMaterial({
        color: 0x7a3818,
        roughness: 0.6,
        metalness: 0.04,
      })
    );
    const lettuceMat = this._track(
      new THREE.MeshStandardMaterial({
        color: 0x45c452,
        roughness: 0.5,
        metalness: 0.02,
      })
    );
    const tomatoMat = this._track(
      new THREE.MeshStandardMaterial({
        color: 0xe6352b,
        roughness: 0.28,
        metalness: 0.05,
      })
    );
    const sauceMat = this._track(
      new THREE.MeshStandardMaterial({
        color: 0xfff3d6,
        roughness: 0.25,
        metalness: 0.02,
      })
    );
    const scleraMat = this._track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.05,
      })
    );
    const pupilMat = this._track(
      new THREE.MeshStandardMaterial({
        color: 0x181311,
        roughness: 0.15,
        metalness: 0.1,
      })
    );
    const gloveMat = this._track(
      new THREE.MeshStandardMaterial({
        color: 0xfff9f2,
        roughness: 0.45,
        metalness: 0.02,
      })
    );
    const shoeMat = this._track(
      new THREE.MeshStandardMaterial({
        color: 0xff3d1f,
        roughness: 0.35,
        metalness: 0.08,
      })
    );
    const soleMat = this._track(
      new THREE.MeshStandardMaterial({
        color: 0xf7f2eb,
        roughness: 0.65,
        metalness: 0.02,
      })
    );

    // Character body container (tilts/bounces independently of root lane/jump transform)
    this.bodyPivot = new THREE.Group();
    this.bodyPivot.position.y = 0.42; // Clearance for legs at y=0
    this.modelRoot.add(this.bodyPivot);

    // 1. Primary Lavash Cylinder Torso
    const torsoGeo = this._track(new THREE.CylinderGeometry(0.47, 0.35, 1.18, 22));
    const torso = new THREE.Mesh(torsoGeo, lavashMat);
    torso.position.y = 0.6;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.bodyPivot.add(torso);

    // Branded restaurant paper wrap cuff around lower half
    const cuffGeo = this._track(new THREE.CylinderGeometry(0.415, 0.355, 0.48, 22));
    const cuff = new THREE.Mesh(cuffGeo, wrapperMat);
    cuff.position.y = 0.26;
    cuff.castShadow = true;
    this.bodyPivot.add(cuff);

    const stripeGeo = this._track(new THREE.TorusGeometry(0.395, 0.026, 8, 24));
    const stripe = new THREE.Mesh(stripeGeo, wrapperStripeMat);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.y = 0.48;
    this.bodyPivot.add(stripe);

    // 2. Top Lavash Folded Rim & Appetizing Fillings
    const rimGeo = this._track(new THREE.TorusGeometry(0.43, 0.075, 10, 22));
    const rim = new THREE.Mesh(rimGeo, lavashMat);
    rim.rotation.x = Math.PI / 2;
    rim.rotation.y = 0.12;
    rim.position.y = 1.18;
    rim.castShadow = true;
    this.bodyPivot.add(rim);

    // Filling cluster peeking out the top
    const meatGeo = this._track(new THREE.DodecahedronGeometry(0.15, 1));
    const lettuceGeo = this._track(new THREE.SphereGeometry(0.16, 10, 8));
    const tomatoGeo = this._track(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 12));

    const fillingOffsets = [
      { geo: lettuceGeo, mat: lettuceMat, pos: [-0.2, 1.24, 0.14], scale: [1.1, 0.65, 1.0], rot: [0.3, 0.2, 0.4] },
      { geo: lettuceGeo, mat: lettuceMat, pos: [0.22, 1.23, 0.08], scale: [1.0, 0.6, 1.1], rot: [-0.2, 0.4, -0.3] },
      { geo: lettuceGeo, mat: lettuceMat, pos: [0.0, 1.24, -0.18], scale: [1.2, 0.65, 0.9], rot: [0.1, 0, 0.2] },
      { geo: meatGeo, mat: meatMat, pos: [-0.08, 1.28, -0.02], scale: [1.1, 0.9, 1.0], rot: [0.4, 0.2, 0.1] },
      { geo: meatGeo, mat: meatMat, pos: [0.11, 1.29, 0.06], scale: [1.0, 0.95, 1.0], rot: [0.1, 0.8, 0.2] },
      { geo: meatGeo, mat: meatMat, pos: [0.0, 1.32, -0.08], scale: [0.95, 0.9, 0.95], rot: [0.5, 0.3, 0.6] },
      { geo: tomatoGeo, mat: tomatoMat, pos: [-0.15, 1.28, -0.12], scale: [1, 1, 1], rot: [0.5, 0.2, -0.3] },
      { geo: tomatoGeo, mat: tomatoMat, pos: [0.18, 1.27, -0.1], scale: [0.9, 1, 0.9], rot: [-0.4, 0.1, 0.5] },
    ];

    fillingOffsets.forEach((f) => {
      const m = new THREE.Mesh(f.geo, f.mat);
      m.position.set(f.pos[0], f.pos[1], f.pos[2]);
      m.scale.set(f.scale[0], f.scale[1], f.scale[2]);
      m.rotation.set(f.rot[0], f.rot[1], f.rot[2]);
      m.castShadow = true;
      this.bodyPivot.add(m);
    });

    // Creamy garlic sauce swirl on top
    const sauceGeo = this._track(new THREE.TorusGeometry(0.14, 0.032, 8, 16, Math.PI * 1.55));
    const sauce = new THREE.Mesh(sauceGeo, sauceMat);
    sauce.rotation.x = Math.PI / 2;
    sauce.position.set(0.02, 1.38, 0.02);
    this.bodyPivot.add(sauce);

    // 3. Expressive Cartoon Face (facing -Z forward, AND visible cleanly from behind/3-quarter camera via side eyes/brows + turning head pose in menu!)
    // Note: In third-person runner, the player runs toward -Z. Putting the face on +Z would make him run backwards,
    // OR putting the face on -Z means during gameplay we see his back, whereas in Menu we orbit/face him!
    // Even better: let's put the face on -Z (front of character) and rotate the mascot toward the camera in Menu,
    // AND add subtle side-cheek & brow silhouettes + dynamic head turn when switching lanes or jumping so the character looks alive from every angle!
    this.faceGroup = new THREE.Group();
    this.faceGroup.position.set(0, 0.78, -0.43);
    this.faceGroup.rotation.y = Math.PI; // Faces -Z (forward direction of travel)
    this.bodyPivot.add(this.faceGroup);

    const eyeGeo = this._track(new THREE.SphereGeometry(0.115, 14, 12));
    const pupilGeo = this._track(new THREE.SphereGeometry(0.062, 12, 10));
    const glintGeo = this._track(new THREE.SphereGeometry(0.022, 8, 8));

    [-0.15, 0.15].forEach((ex, idx) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(ex, 0.04, 0.02);

      const sclera = new THREE.Mesh(eyeGeo, scleraMat);
      sclera.scale.set(0.95, 1.18, 0.75);
      eyeGroup.add(sclera);

      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(idx === 0 ? 0.015 : -0.015, 0, 0.068);
      eyeGroup.add(pupil);

      const glint = new THREE.Mesh(glintGeo, scleraMat);
      glint.position.set(idx === 0 ? 0.04 : 0.01, 0.035, 0.115);
      eyeGroup.add(glint);

      this.faceGroup.add(eyeGroup);
    });

    // Eyebrows
    const browGeo = this._track(new THREE.CapsuleGeometry(0.022, 0.11, 4, 8));
    this.leftBrow = new THREE.Mesh(browGeo, meatMat);
    this.leftBrow.rotation.z = Math.PI / 2 + 0.14;
    this.leftBrow.position.set(-0.15, 0.19, 0.04);
    this.faceGroup.add(this.leftBrow);

    this.rightBrow = new THREE.Mesh(browGeo, meatMat);
    this.rightBrow.rotation.z = Math.PI / 2 - 0.14;
    this.rightBrow.position.set(0.15, 0.19, 0.04);
    this.faceGroup.add(this.rightBrow);

    // Big cheerful smile
    const smileGeo = this._track(new THREE.TorusGeometry(0.12, 0.024, 8, 16, Math.PI));
    const smile = new THREE.Mesh(smileGeo, pupilMat);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.08, 0.055);
    this.faceGroup.add(smile);

    // 4. Short Arms with Cartoon Gloves
    const armGeo = this._track(new THREE.CapsuleGeometry(0.065, 0.24, 6, 10));
    const handGeo = this._track(new THREE.SphereGeometry(0.105, 12, 10));

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.46, 0.74, 0);
    const leftArm = new THREE.Mesh(armGeo, lavashMat);
    leftArm.position.set(-0.06, -0.14, 0);
    leftArm.rotation.z = -0.32;
    leftArm.castShadow = true;
    const leftHand = new THREE.Mesh(handGeo, gloveMat);
    leftHand.position.set(-0.13, -0.29, 0);
    leftHand.castShadow = true;
    this.leftArmPivot.add(leftArm, leftHand);
    this.bodyPivot.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.46, 0.74, 0);
    const rightArm = new THREE.Mesh(armGeo, lavashMat);
    rightArm.position.set(0.06, -0.14, 0);
    rightArm.rotation.z = 0.32;
    rightArm.castShadow = true;
    const rightHand = new THREE.Mesh(handGeo, gloveMat);
    rightHand.position.set(0.13, -0.29, 0);
    rightHand.castShadow = true;
    this.rightArmPivot.add(rightArm, rightHand);
    this.bodyPivot.add(this.rightArmPivot);

    // 5. Short Legs with Sneakers (anchored so feet touch y = 0)
    const legGeo = this._track(new THREE.CapsuleGeometry(0.07, 0.18, 6, 10));
    const shoeGeo = this._track(new THREE.BoxGeometry(0.18, 0.11, 0.28));
    const soleGeo = this._track(new THREE.BoxGeometry(0.195, 0.04, 0.3));

    const makeLeg = (xOffset) => {
      const pivot = new THREE.Group();
      pivot.position.set(xOffset, 0.42, 0);

      const leg = new THREE.Mesh(legGeo, lavashMat);
      leg.position.set(0, -0.14, 0);
      leg.castShadow = true;
      pivot.add(leg);

      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(0, -0.32, -0.05);
      shoe.castShadow = true;
      pivot.add(shoe);

      const sole = new THREE.Mesh(soleGeo, soleMat);
      sole.position.set(0, -0.39, -0.05);
      pivot.add(sole);

      return pivot;
    };

    this.leftLegPivot = makeLeg(-0.19);
    this.rightLegPivot = makeLeg(0.19);
    this.modelRoot.add(this.leftLegPivot, this.rightLegPivot);
  }

  /**
   * Future-ready hook: replaces the temporary procedural mascot with the restaurant's GLB/GLTF model.
   * @param {string} url
   */
  async loadCustomMascotGLB(url) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);

    // Remove procedural children from modelRoot while keeping root transforms
    while (this.modelRoot.children.length > 0) {
      this.modelRoot.remove(this.modelRoot.children[0]);
    }

    const customScene = gltf.scene;
    customScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Normalize scale & bottom-center pivot
    const box = new THREE.Box3().setFromObject(customScene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const targetHeight = 1.8;
    const scale = targetHeight / Math.max(size.y, 0.001);
    customScene.scale.setScalar(scale);
    customScene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    this.modelRoot.add(customScene);

    if (gltf.animations && gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(customScene);
      gltf.animations.forEach((clip) => {
        const action = this.mixer.clipAction(clip);
        this.customModelActions[clip.name.toLowerCase()] = action;
      });
      const defaultClip = gltf.animations[0];
      this.mixer.clipAction(defaultClip).play();
    }

    this.usingCustomGLB = true;
  }

  reset() {
    this.laneIndex = 1;
    this.x = LANE_POSITIONS[1];
    this.y = 0;
    this.z = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.jumpBufferTimer = 0;
    this.runTime = 0;
    this.bankAngle = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.squashZ = 1;

    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.set(0, 0, 0);
    this.modelRoot.rotation.set(0, 0, 0);
    this.modelRoot.scale.set(1, 1, 1);
    this.modelRoot.position.set(0, 0, 0);
    if (this.bodyPivot) {
      this.bodyPivot.rotation.set(0, 0, 0);
      this.bodyPivot.position.y = 0.42;
    }
    this.contactShadow.position.set(this.x, 0.025, this.z);
    this.contactShadow.scale.set(1, 1, 1);
  }

  moveLeft() {
    if (this.laneIndex > 0) {
      this.laneIndex -= 1;
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.laneIndex < 2) {
      this.laneIndex += 1;
      return true;
    }
    return false;
  }

  jump() {
    if (this.isGrounded) {
      this._executeJump();
      return true;
    }
    // Buffer jump slightly before landing for crisp responsiveness
    this.jumpBufferTimer = 0.14;
    return false;
  }

  _executeJump() {
    this.vy = 14.8;
    this.isGrounded = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.jumpBufferTimer = 0;
    this.squashX = 0.82;
    this.squashY = 1.24;
    this.squashZ = 0.82;
  }

  slide() {
    if (!this.isGrounded) {
      // Fast-fall slam into slide!
      this.vy = Math.min(this.vy, -18.0);
    }
    this.isSliding = true;
    this.slideTimer = 0.65;
    this.squashX = 1.22;
    this.squashY = 0.72;
    this.squashZ = 1.22;
    return true;
  }

  /**
   * Idle showcase pose used on the main menu background.
   * @param {number} dt
   * @param {number} elapsed
   */
  updateMenuIdle(dt, elapsed) {
    this.group.position.set(1.15, 0, -1.5);
    this.modelRoot.rotation.y = Math.PI + Math.sin(elapsed * 0.9) * 0.25;
    this.modelRoot.position.y = Math.abs(Math.sin(elapsed * 3.0)) * 0.08;
    this.modelRoot.scale.set(1, 1, 1);

    if (this.mixer) {
      this.mixer.update(dt);
    } else if (this.bodyPivot) {
      this.bodyPivot.rotation.set(0, 0, Math.sin(elapsed * 2.5) * 0.05);
      this.leftArmPivot.rotation.x = -0.3 + Math.sin(elapsed * 4.0) * 0.25;
      this.rightArmPivot.rotation.x = 0.2 - Math.sin(elapsed * 4.0) * 0.25;
      this.leftLegPivot.rotation.x = 0;
      this.rightLegPivot.rotation.x = 0;
    }

    this.contactShadow.position.set(this.group.position.x, 0.025, this.group.position.z);
    this.contactShadow.scale.set(1, 1, 1);
    this.contactShadow.material.opacity = 0.65;
  }

  /**
   * Main gameplay physics & animation tick.
   * @param {number} dt
   * @param {number} forwardSpeed
   */
  update(dt, forwardSpeed) {
    // Advance forward along -Z
    this.z -= forwardSpeed * dt;

    // Smooth horizontal lane glide
    const targetX = LANE_POSITIONS[this.laneIndex];
    const prevX = this.x;
    this.x = THREE.MathUtils.damp(this.x, targetX, 16, dt);
    const vx = (this.x - prevX) / Math.max(dt, 0.0001);

    // Jump buffer countdown
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
    }

    // Vertical jump & gravity
    if (!this.isGrounded) {
      this.vy -= 38.0 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.isGrounded = true;
        this.squashX = 1.18;
        this.squashY = 0.82;
        this.squashZ = 1.18;
        if (this.jumpBufferTimer > 0) {
          this._executeJump();
        }
      }
    }

    // Slide timer
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // Recover squash-and-stretch smoothly
    this.squashX = THREE.MathUtils.damp(this.squashX, 1, 14, dt);
    this.squashY = THREE.MathUtils.damp(this.squashY, 1, 14, dt);
    this.squashZ = THREE.MathUtils.damp(this.squashZ, 1, 14, dt);

    // Apply root position
    this.group.position.set(this.x, this.y, this.z);

    // Lean into lane switch
    const targetBank = THREE.MathUtils.clamp(-vx * 0.032, -0.34, 0.34);
    this.bankAngle = THREE.MathUtils.damp(this.bankAngle, targetBank, 14, dt);

    // Character animation
    this.runTime += dt * (forwardSpeed * 0.92);

    if (this.mixer) {
      this.mixer.update(dt);
    } else {
      this.modelRoot.rotation.y = 0;
      const slideFactor = this.isSliding ? 1 : 0;
      const targetScaleY = this.isSliding ? 0.54 : 1.0;
      const targetScaleXZ = this.isSliding ? 1.16 : 1.0;
      const curScaleY = THREE.MathUtils.damp(this.modelRoot.scale.y, targetScaleY * this.squashY, 18, dt);
      const curScaleXZ = THREE.MathUtils.damp(this.modelRoot.scale.x, targetScaleXZ * this.squashX, 18, dt);
      this.modelRoot.scale.set(curScaleXZ, curScaleY, curScaleXZ);

      // Slide tilt forward vs running bob
      const targetTiltX = this.isSliding ? -0.52 : !this.isGrounded ? 0.14 : 0.08;
      this.bodyPivot.rotation.x = THREE.MathUtils.damp(this.bodyPivot.rotation.x, targetTiltX, 16, dt);
      this.bodyPivot.rotation.z = this.bankAngle;

      if (!this.isGrounded) {
        // Mid-air superhero pose
        this.leftLegPivot.rotation.x = 0.55;
        this.rightLegPivot.rotation.x = -0.45;
        this.leftArmPivot.rotation.x = -0.95;
        this.rightArmPivot.rotation.x = -0.95;
        this.bodyPivot.position.y = 0.42;
      } else if (this.isSliding) {
        // Low slide tuck
        this.leftLegPivot.rotation.x = -1.15;
        this.rightLegPivot.rotation.x = -1.0;
        this.leftArmPivot.rotation.x = 0.7;
        this.rightArmPivot.rotation.x = 0.7;
        this.bodyPivot.position.y = 0.32;
      } else {
        // Energetic cartoon run cycle
        const stride = Math.sin(this.runTime);
        const bounce = Math.abs(Math.cos(this.runTime)) * 0.085;
        this.leftLegPivot.rotation.x = stride * 0.85;
        this.rightLegPivot.rotation.x = -stride * 0.85;
        this.leftArmPivot.rotation.x = -stride * 0.75;
        this.rightArmPivot.rotation.x = stride * 0.75;
        this.bodyPivot.position.y = 0.42 + bounce * (1 - slideFactor);
      }
    }

    // Update ground contact shadow
    this.contactShadow.position.set(this.x, 0.025, this.z);
    const shadowScale = Math.max(0.45, 1.0 - this.y * 0.14);
    this.contactShadow.scale.setScalar(shadowScale);
    this.contactShadow.material.opacity = Math.max(0.18, 0.65 - this.y * 0.12);

    // Update deterministic hitbox
    this.bounds.x = this.x;
    this.bounds.y = this.y;
    this.bounds.z = this.z;
    this.bounds.width = 0.72;
    this.bounds.height = this.isSliding ? 0.82 : 1.66;
    this.bounds.depth = 0.68;
  }

  dispose() {
    this.scene.remove(this.group);
    this.scene.remove(this.contactShadow);
    this.disposables.forEach((d) => {
      if (d && typeof d.dispose === 'function') d.dispose();
    });
    this.disposables.length = 0;
  }
}
