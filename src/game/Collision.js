// Deterministic, zero-allocation AABB collision system

export class CollisionSystem {
  constructor() {
    this.playerBox = {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      minZ: 0,
      maxZ: 0,
    };
  }

  /**
   * Updates the player's world-space AABB with fair inner margins.
   * @param {{ x: number, y: number, z: number, width: number, height: number, depth: number }} bounds
   */
  updatePlayerBounds(bounds) {
    const halfW = bounds.width * 0.5;
    const halfD = bounds.depth * 0.5;
    this.playerBox.minX = bounds.x - halfW;
    this.playerBox.maxX = bounds.x + halfW;
    this.playerBox.minY = bounds.y;
    this.playerBox.maxY = bounds.y + bounds.height;
    this.playerBox.minZ = bounds.z - halfD;
    this.playerBox.maxZ = bounds.z + halfD;
  }

  /**
   * @param {{ minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number }} b
   */
  _intersectsPlayer(b) {
    const p = this.playerBox;
    return (
      p.minX < b.maxX &&
      p.maxX > b.minX &&
      p.minY < b.maxY &&
      p.maxY > b.minY &&
      p.minZ < b.maxZ &&
      p.maxZ > b.minZ
    );
  }

  /**
   * Checks active obstacles against the player hitbox.
   * @param {Array} obstacles
   * @returns {object|null}
   */
  checkObstacles(obstacles) {
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (!obs.active) continue;
      if (this._intersectsPlayer(obs.hitbox)) {
        return obs;
      }
    }
    return null;
  }

  /**
   * Checks active collectibles against a slightly generous pickup box.
   * @param {Array} collectibles
   * @param {Array} outPicked - reused output array to avoid GC
   */
  checkCollectibles(collectibles, outPicked) {
    outPicked.length = 0;
    const p = this.playerBox;
    const padX = 0.28;
    const padY = 0.25;
    const padZ = 0.32;

    for (let i = 0; i < collectibles.length; i++) {
      const item = collectibles[i];
      if (!item.active) continue;
      const b = item.hitbox;
      if (
        p.minX - padX < b.maxX &&
        p.maxX + padX > b.minX &&
        p.minY - padY < b.maxY &&
        p.maxY + padY > b.minY &&
        p.minZ - padZ < b.maxZ &&
        p.maxZ + padZ > b.minZ
      ) {
        outPicked.push(item);
      }
    }
  }
}
