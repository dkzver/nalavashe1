export class Controls {
  /**
   * @param {HTMLElement} touchTarget
   * @param {{
   *   onLeft: () => void,
   *   onRight: () => void,
   *   onJump: () => void,
   *   onSlide: () => void,
   *   onPauseToggle: () => void
   * }} handlers
   */
  constructor(touchTarget, handlers) {
    this.touchTarget = touchTarget;
    this.handlers = handlers;
    this.enabled = false;

    this.touchStartX = 0;
    this.touchStartY = 0;
    this.swipeConsumed = false;
    this.swipeThreshold = 28;

    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleTouchEnd.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    this.touchTarget.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.touchTarget.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.touchTarget.addEventListener('touchend', this._onTouchEnd, { passive: true });

    this._bindMobileButtons();
  }

  setEnabled(value) {
    this.enabled = value;
  }

  _bindMobileButtons() {
    const map = [
      ['touch-left', () => this.handlers.onLeft()],
      ['touch-right', () => this.handlers.onRight()],
      ['touch-jump', () => this.handlers.onJump()],
      ['touch-slide', () => this.handlers.onSlide()],
    ];

    this._buttonCleanups = [];
    for (const [id, fn] of map) {
      const el = document.getElementById(id);
      if (!el) continue;
      const trigger = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.enabled) fn();
      };
      el.addEventListener('pointerdown', trigger);
      this._buttonCleanups.push(() => el.removeEventListener('pointerdown', trigger));
    }
  }

  _handleKeyDown(e) {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      this.handlers.onPauseToggle();
      return;
    }

    if (!this.enabled) return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        e.preventDefault();
        this.handlers.onLeft();
        break;
      case 'ArrowRight':
      case 'KeyD':
        e.preventDefault();
        this.handlers.onRight();
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        e.preventDefault();
        this.handlers.onJump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.handlers.onSlide();
        break;
      default:
        break;
    }
  }

  _handleTouchStart(e) {
    if (!this.enabled || e.touches.length === 0) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.swipeConsumed = false;
  }

  _handleTouchMove(e) {
    if (!this.enabled || this.swipeConsumed || e.touches.length === 0) return;
    e.preventDefault();

    const dx = e.touches[0].clientX - this.touchStartX;
    const dy = e.touches[0].clientY - this.touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < this.swipeThreshold) return;

    this.swipeConsumed = true;
    if (absX > absY) {
      if (dx < 0) this.handlers.onLeft();
      else this.handlers.onRight();
    } else {
      if (dy < 0) this.handlers.onJump();
      else this.handlers.onSlide();
    }
  }

  _handleTouchEnd() {
    this.swipeConsumed = false;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    this.touchTarget.removeEventListener('touchstart', this._onTouchStart);
    this.touchTarget.removeEventListener('touchmove', this._onTouchMove);
    this.touchTarget.removeEventListener('touchend', this._onTouchEnd);
    for (const cleanup of this._buttonCleanups) {
      cleanup();
    }
  }
}
