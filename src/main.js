import './style.css';
import { SoundManager } from './game/Audio.js';
import { UI } from './game/UI.js';
import { Game } from './game/Game.js';

function bootstrap() {
  const container = document.getElementById('game-canvas-container');
  if (!container) return;

  const audio = new SoundManager();
  let game = null;

  const ui = new UI({
    onPlay: () => {
      if (game) game.start();
    },
    onResume: () => {
      if (!game) return;
      if (game.state === 'playing') game.pause();
      else if (game.state === 'paused') game.resume();
    },
    onRestart: () => {
      if (game) game.start();
    },
    onReturnMenu: () => {
      if (game) game.returnToMenu();
    },
    onToggleSound: () => audio.toggleMute(),
    onButtonClick: () => audio.playClick(),
  });

  ui.syncSoundIcons(audio.isMuted());
  ui.setLoadingProgress(35);

  window.requestAnimationFrame(() => {
    ui.setLoadingProgress(75);

    try {
      game = new Game({ container, audio, ui });
      window.setTimeout(() => {
        ui.setLoadingProgress(100);
        ui.showScreen('menu');
      }, 260);
    } catch (error) {
      // Keep the restaurant link available when WebGL or GPU initialization fails.
      console.error('LAVA DASH could not initialize:', error);
      ui.showScreen('error');
    }
  });

  window.addEventListener('beforeunload', () => {
    if (game) game.dispose();
    audio.dispose();
  });
}

bootstrap();
