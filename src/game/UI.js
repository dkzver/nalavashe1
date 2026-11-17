const BEST_SCORE_KEY = 'lavadash_best_score';

/**
 * Extensible server-promo hook.
 * Returns null while no server endpoint is connected; ready to integrate with
 * https://nalavashe-vl.ru/ API for real server-verified promo rewards.
 */
export class PromoService {
  async checkRunReward(_runSummary) {
    return null;
  }
}

export class UI {
  /**
   * @param {{
   *   onPlay: () => void,
   *   onResume: () => void,
   *   onRestart: () => void,
   *   onReturnMenu: () => void,
   *   onToggleSound: () => boolean,
   *   onButtonClick: () => void
   * }} callbacks
   */
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.promoService = new PromoService();
    this.bestScore = this._loadBestScore();

    this.screens = {
      loading: document.getElementById('screen-loading'),
      menu: document.getElementById('screen-menu'),
      howto: document.getElementById('screen-howto'),
      hud: document.getElementById('screen-hud'),
      pause: document.getElementById('screen-pause'),
      gameover: document.getElementById('screen-gameover'),
    };

    this.els = {
      loadingBar: document.getElementById('loading-bar'),
      loadingPercent: document.getElementById('loading-percent'),
      menuBestScore: document.getElementById('menu-best-score'),
      hudScore: document.getElementById('hud-score'),
      hudDistance: document.getElementById('hud-distance'),
      hudItems: document.getElementById('hud-items'),
      hudFloatLayer: document.getElementById('hud-float-layer'),
      goScore: document.getElementById('go-score'),
      goDistance: document.getElementById('go-distance'),
      goItems: document.getElementById('go-items'),
      goBest: document.getElementById('go-best'),
      goRecordBadge: document.getElementById('gameover-record-badge'),
      promoStatusSlot: document.getElementById('promo-status-slot'),
    };

    this._bindEvents();
    this.updateBestScoreUI();
  }

  _loadBestScore() {
    try {
      const raw = localStorage.getItem(BEST_SCORE_KEY);
      const val = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(val) && val > 0 ? val : 0;
    } catch {
      return 0;
    }
  }

  _saveBestScore(score) {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
    } catch {
      // Ignore storage errors
    }
  }

  getBestScore() {
    return this.bestScore;
  }

  updateBestScoreUI() {
    if (this.els.menuBestScore) {
      this.els.menuBestScore.textContent = this.bestScore.toLocaleString('ru-RU');
    }
  }

  syncSoundIcons(isMuted) {
    document.querySelectorAll('.sound-icon-on').forEach((el) => {
      el.classList.toggle('hidden', isMuted);
    });
    document.querySelectorAll('.sound-icon-off').forEach((el) => {
      el.classList.toggle('hidden', !isMuted);
    });
  }

  setLoadingProgress(percent) {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    if (this.els.loadingBar) this.els.loadingBar.style.width = `${clamped}%`;
    if (this.els.loadingPercent) this.els.loadingPercent.textContent = `${clamped}%`;
  }

  showScreen(name) {
    Object.entries(this.screens).forEach(([key, el]) => {
      if (!el) return;
      if (key === 'hud') {
        const showHud = name === 'hud' || name === 'pause';
        el.classList.toggle('hidden', !showHud);
      } else {
        const isActive = key === name;
        el.classList.toggle('active', isActive);
        el.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      }
    });
  }

  updateHUD(score, distanceMeters, itemsCount) {
    if (this.els.hudScore) {
      this.els.hudScore.textContent = Math.floor(score).toLocaleString('ru-RU');
    }
    if (this.els.hudDistance) {
      this.els.hudDistance.textContent = `${Math.floor(distanceMeters)} м`;
    }
    if (this.els.hudItems) {
      this.els.hudItems.textContent = String(itemsCount);
    }
  }

  spawnFloatingScore(text, color = '#FFB300') {
    if (!this.els.hudFloatLayer) return;
    const el = document.createElement('div');
    el.className = 'float-score';
    el.style.color = color;
    el.textContent = text;
    this.els.hudFloatLayer.appendChild(el);
    window.setTimeout(() => {
      el.remove();
    }, 820);
  }

  async showGameOver(summary) {
    const finalScore = Math.floor(summary.score);
    const isNewRecord = finalScore > this.bestScore && finalScore > 0;
    if (isNewRecord) {
      this.bestScore = finalScore;
      this._saveBestScore(this.bestScore);
      this.updateBestScoreUI();
    }

    if (this.els.goScore) this.els.goScore.textContent = finalScore.toLocaleString('ru-RU');
    if (this.els.goDistance) this.els.goDistance.textContent = `${Math.floor(summary.distance)} м`;
    if (this.els.goItems) this.els.goItems.textContent = String(summary.items);
    if (this.els.goBest) this.els.goBest.textContent = this.bestScore.toLocaleString('ru-RU');
    if (this.els.goRecordBadge) {
      this.els.goRecordBadge.classList.toggle('hidden', !isNewRecord);
    }

    if (this.els.promoStatusSlot) {
      this.els.promoStatusSlot.classList.add('hidden');
      this.els.promoStatusSlot.textContent = '';
      const serverReward = await this.promoService.checkRunReward(summary);
      if (serverReward && serverReward.message) {
        this.els.promoStatusSlot.textContent = serverReward.message;
        this.els.promoStatusSlot.classList.remove('hidden');
      }
    }

    this.showScreen('gameover');
  }

  _bindEvents() {
    const clickWrap = (fn) => () => {
      this.callbacks.onButtonClick();
      fn();
    };

    document.getElementById('btn-play')?.addEventListener('click', clickWrap(() => this.callbacks.onPlay()));
    document.getElementById('btn-how-to-play')?.addEventListener('click', clickWrap(() => this.showScreen('howto')));
    document.getElementById('btn-close-howto')?.addEventListener('click', clickWrap(() => this.showScreen('menu')));
    document.getElementById('btn-howto-play-start')?.addEventListener('click', clickWrap(() => this.callbacks.onPlay()));

    document.getElementById('btn-pause')?.addEventListener('click', clickWrap(() => this.callbacks.onResume()));
    document.getElementById('btn-resume')?.addEventListener('click', clickWrap(() => this.callbacks.onResume()));
    document.getElementById('btn-restart-pause')?.addEventListener('click', clickWrap(() => this.callbacks.onRestart()));
    document.getElementById('btn-menu-pause')?.addEventListener('click', clickWrap(() => this.callbacks.onReturnMenu()));

    document.getElementById('btn-retry')?.addEventListener('click', clickWrap(() => this.callbacks.onRestart()));
    document.getElementById('btn-go-menu')?.addEventListener('click', clickWrap(() => this.callbacks.onReturnMenu()));

    const soundButtons = ['btn-sound-menu', 'btn-sound-hud', 'btn-sound-pause'];
    soundButtons.forEach((id) => {
      document.getElementById(id)?.addEventListener('click', () => {
        const muted = this.callbacks.onToggleSound();
        this.syncSoundIcons(muted);
        if (!muted) this.callbacks.onButtonClick();
      });
    });
  }
}
