import './styles.css';
import { SKINS, type ControlMode, type GameMode, type MinimapMode, type SkinId, type WorldSnapshot } from '../shared/types';
import { InputController } from './input';
import { Minimap } from './minimap';
import { MobileControls } from './mobileControls';
import { GameSocket } from './network';
import { Renderer } from './renderer';
import { interpolateSnapshot } from './snapshotInterpolation';
import {
  loadSettings,
  saveSettings,
  type BoostGlowMode,
  type FoodAnimationMode,
  type MobileControlMode,
  type SnakeVisualMode,
} from './settings';
import { ui } from './ui';

const {
  canvas,
  startMenu,
  playButton,
  fullscreenButton,
  menuSettingsButton,
  exitButton,
  playerName,
  modeSelector,
  openSkinEditorButton,
  selectedSkinSwatch,
  selectedSkinName,
  skinEditorPanel,
  skinPreview,
  skinPreviewName,
  colorSkinGrid,
  countrySkinGrid,
  confirmSkinButton,
  cancelSkinButton,
  statusText,
  hud,
  minimapPanel,
  minimapCanvas,
  leaderboard,
  leaderboardList,
  scoreValue,
  lengthValue,
  gameOverPanel,
  gameOverScore,
  playAgainButton,
  backToMenuButton,
  settingsButton,
  settingsPanel,
  settingsBackButton,
  minimapMode,
  boostGlowMode,
  snakeVisualMode,
  foodAnimationMode,
  controlMode,
  mobileControlMode,
  mobileControls,
  mobileJoystick,
  mobileJoystickKnob,
  mobileBoostButton,
  devControls,
  fpsValue,
  pauseButton,
  godModeButton,
  infiniteBoostButton,
  clearDeathMassButton,
  autoCircleButton,
} = ui;

const context = canvas.getContext('2d');
if (!context) {
  throw new Error('Canvas 2D indisponivel');
}

let selectedSkin: SkinId = SKINS[0].id;
let editingSkin: SkinId = selectedSkin;
let selectedGameMode: GameMode = 'ai';
let paused = false;
let godMode = false;
let infiniteBoost = false;
let autoCircle = false;
let fpsFrames = 0;
let fpsLastUpdate = performance.now();
let snapshot: WorldSnapshot | null = null;
let previousSnapshot: WorldSnapshot | null = null;
let snapshotReceivedAt = performance.now();
let selfId: string | null = null;
let playing = false;

const socket = new GameSocket();
const input = new InputController(canvas);
const renderer = new Renderer(canvas, context);
const minimap = new Minimap(minimapCanvas);
new MobileControls(
  {
    joystick: mobileJoystick,
    joystickKnob: mobileJoystickKnob,
    boostButton: mobileBoostButton,
  },
  input,
);
let visualSettings = loadSettings();

const renderSkins = (): void => {
  colorSkinGrid.innerHTML = '';
  countrySkinGrid.innerHTML = '';
  const previewSkin = SKINS.find((skin) => skin.id === editingSkin) ?? SKINS[0];

  for (const skin of SKINS) {
    const button = document.createElement('button');
    button.className = `skinButton${skin.id === editingSkin ? ' active' : ''}`;
    button.type = 'button';
    button.title = skin.name;
    button.innerHTML = `<span class="skinSwatch" style="background: linear-gradient(90deg, ${skin.body.join(', ')})"></span>${skin.name}`;
    button.addEventListener('click', () => {
      editingSkin = skin.id;
      renderSkins();
    });
    const grid = skin.category === 'country' ? countrySkinGrid : colorSkinGrid;
    grid.appendChild(button);
  }

  skinPreview.innerHTML = '';
  for (let index = 0; index < 12; index += 1) {
    const segment = document.createElement('span');
    segment.className = 'skinPreviewSegment';
    segment.style.background = index === 11
      ? previewSkin.head
      : previewSkin.body[index % previewSkin.body.length];
    skinPreview.appendChild(segment);
  }
  skinPreviewName.textContent = previewSkin.name;
};

const syncSelectedSkin = (): void => {
  const skin = SKINS.find((entry) => entry.id === selectedSkin) ?? SKINS[0];
  selectedSkinSwatch.style.background = `linear-gradient(90deg, ${skin.body.join(', ')})`;
  selectedSkinName.textContent = skin.name;
};

const openSkinEditor = (): void => {
  editingSkin = selectedSkin;
  renderSkins();
  startMenu.classList.add('hidden');
  skinEditorPanel.classList.remove('hidden');
};

const closeSkinEditor = (): void => {
  skinEditorPanel.classList.add('hidden');
  startMenu.classList.remove('hidden');
};

const renderGameMode = (): void => {
  for (const button of modeSelector.querySelectorAll<HTMLButtonElement>('.modeButton')) {
    const mode = button.dataset.mode as GameMode | undefined;
    button.classList.toggle('active', mode === selectedGameMode);
  }
};

const syncSettingsUi = (): void => {
  minimapMode.value = visualSettings.minimap;
  boostGlowMode.value = visualSettings.boostGlow;
  snakeVisualMode.value = visualSettings.snakeVisual;
  foodAnimationMode.value = visualSettings.foodAnimation;
  controlMode.value = visualSettings.controlMode;
  mobileControlMode.value = visualSettings.mobileControlMode;
  renderer.setBoostGlowMode(visualSettings.boostGlow);
  renderer.setSnakeVisualMode(visualSettings.snakeVisual);
  renderer.setFoodAnimationMode(visualSettings.foodAnimation);
  mobileControls.classList.toggle('joystickMode', visualSettings.mobileControlMode === 'joystick');
  minimapPanel.classList.toggle('disabled', visualSettings.minimap === 'off');
  if (visualSettings.minimap === 'off') {
    minimap.clear();
  }
};

const openSettings = (): void => {
  if (!playing) {
    startMenu.classList.add('hidden');
  }
  mobileControls.classList.add('hidden');
  settingsPanel.classList.remove('hidden');
};

const closeSettings = (): void => {
  settingsPanel.classList.add('hidden');
  if (!playing) {
    startMenu.classList.remove('hidden');
  } else {
    mobileControls.classList.remove('hidden');
  }
};

const enterMobileFullscreen = async (): Promise<void> => {
  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  try {
    if (!document.fullscreenElement) {
      if (root.requestFullscreen) {
        await root.requestFullscreen({ navigationUI: 'hide' });
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      } else {
        statusText.textContent = 'Use Adicionar a tela inicial para fullscreen';
        return;
      }
    }
  } catch {
    statusText.textContent = 'Fullscreen bloqueado pelo navegador';
    return;
  }

  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (mode: 'landscape') => Promise<void>;
    };
    await orientation.lock?.('landscape');
  } catch {
    // Alguns navegadores permitem apenas a preferencia landscape do manifesto.
  }
};

const exitGame = async (): Promise<void> => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch {
    // O navegador pode manter a tela cheia ao bloquear o fechamento da aba.
  }

  window.close();
  window.setTimeout(() => {
    statusText.textContent = 'Feche esta aba para sair';
  }, 150);
};

const join = (resetMatch = false): void => {
  if (!socket.connected) {
    return;
  }

  void enterMobileFullscreen();
  socket.send({
    type: 'join',
    name: playerName.value,
    skin: selectedSkin,
    gameMode: selectedGameMode,
    minimapMode: visualSettings.minimap,
    resetMatch: selectedGameMode === 'ai' && resetMatch,
  });
  startMenu.classList.add('hidden');
  gameOverPanel.classList.add('hidden');
  hud.classList.remove('hidden');
  minimapPanel.classList.remove('hidden');
  leaderboard.classList.remove('hidden');
  devControls.classList.remove('hidden');
  mobileControls.classList.remove('hidden');
  settingsPanel.classList.add('hidden');
  playing = true;
};

const updateHud = (): void => {
  if (!snapshot || !selfId) {
    return;
  }

  const self = snapshot.snakes.find((snake) => snake.id === selfId);
  if (self) {
    scoreValue.textContent = Math.floor(self.score).toString();
    lengthValue.textContent = self.segments.length.toString();
  }

  leaderboardList.innerHTML = '';
  for (const entry of snapshot.leaderboard) {
    const item = document.createElement('li');
    item.textContent = `${entry.name} - ${entry.score}`;
    leaderboardList.appendChild(item);
  }
};

const getSelf = (): NonNullable<WorldSnapshot['snakes'][number]> | null => {
  if (!snapshot || !selfId) {
    return null;
  }

  return snapshot.snakes.find((snake) => snake.id === selfId) ?? null;
};

const getControlTarget = (): { x: number; y: number } => {
  const self = getSelf();
  if (!self) {
    return renderer.screenToWorld(input.target);
  }

  const head = self.segments[0];
  if (autoCircle) {
    // Aim almost directly behind the head. This keeps the turn direction
    // stable while asking the server's turn lerp for its tightest curve.
    const tightTurnAngle = self.angle + Math.PI * 0.96;
    return {
      x: head.x + Math.cos(tightTurnAngle) * 1000,
      y: head.y + Math.sin(tightTurnAngle) * 1000,
    };
  }

  const mobileJoystickActive = window.matchMedia('(pointer: coarse)').matches
    && visualSettings.mobileControlMode === 'joystick';

  if (mobileJoystickActive) {
    const direction = input.virtualDirection;
    if (Math.hypot(direction.x, direction.y) > 0) {
      return {
        x: head.x + direction.x * 1000,
        y: head.y + direction.y * 1000,
      };
    }

    return {
      x: head.x + Math.cos(self.angle) * 1000,
      y: head.y + Math.sin(self.angle) * 1000,
    };
  }

  if (visualSettings.controlMode === 'keyboard') {
    const direction = input.keyboardDirection;
    if (Math.hypot(direction.x, direction.y) > 0) {
      return {
        x: head.x + direction.x * 1000,
        y: head.y + direction.y * 1000,
      };
    }

    return {
      x: head.x + Math.cos(self.angle) * 1000,
      y: head.y + Math.sin(self.angle) * 1000,
    };
  }

  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const dx = input.target.x - viewportWidth / 2;
  const dy = input.target.y - viewportHeight / 2;
  const distance = Math.hypot(dx, dy);

  if (distance < 22) {
    return {
      x: head.x + Math.cos(self.angle) * 1000,
      y: head.y + Math.sin(self.angle) * 1000,
    };
  }

  return {
    x: head.x + (dx / distance) * 1000,
    y: head.y + (dy / distance) * 1000,
  };
};

socket.onMessage((message) => {
  if (message.type === 'welcome') {
    selfId = message.id;
    previousSnapshot = null;
    snapshot = message.snapshot;
    snapshotReceivedAt = performance.now();
    if (infiniteBoost) {
      socket.send({ type: 'dev', infiniteBoost: true });
    }
  }

  if (message.type === 'state') {
    previousSnapshot = snapshot;
    snapshot = message.snapshot;
    snapshotReceivedAt = performance.now();
  }

  if (message.type === 'dead') {
    playing = false;
    gameOverScore.textContent = message.score.toString();
    gameOverPanel.classList.remove('hidden');
    hud.classList.add('hidden');
    minimapPanel.classList.add('hidden');
    devControls.classList.add('hidden');
    mobileControls.classList.add('hidden');
    selfId = null;
  }

  updateHud();
});

playButton.addEventListener('click', () => join(true));
fullscreenButton.addEventListener('click', () => {
  void enterMobileFullscreen();
});
openSkinEditorButton.addEventListener('click', openSkinEditor);
confirmSkinButton.addEventListener('click', () => {
  selectedSkin = editingSkin;
  syncSelectedSkin();
  closeSkinEditor();
});
cancelSkinButton.addEventListener('click', closeSkinEditor);
playAgainButton.addEventListener('click', () => join(true));
backToMenuButton.addEventListener('click', () => {
  gameOverPanel.classList.add('hidden');
  leaderboard.classList.add('hidden');
  startMenu.classList.remove('hidden');
});
settingsButton.addEventListener('click', () => {
  if (settingsPanel.classList.contains('hidden')) {
    openSettings();
  } else {
    closeSettings();
  }
});
menuSettingsButton.addEventListener('click', openSettings);
exitButton.addEventListener('click', () => {
  void exitGame();
});
settingsBackButton.addEventListener('click', closeSettings);
modeSelector.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.modeButton');
  const mode = button?.dataset.mode;
  if (mode !== 'ai' && mode !== 'multiplayer') {
    return;
  }

  selectedGameMode = mode;
  renderGameMode();
});
minimapMode.addEventListener('change', () => {
  visualSettings = { ...visualSettings, minimap: minimapMode.value as MinimapMode };
  saveSettings(visualSettings);
  syncSettingsUi();
  socket.send({ type: 'settings', minimapMode: visualSettings.minimap });
});
boostGlowMode.addEventListener('change', () => {
  visualSettings = { ...visualSettings, boostGlow: boostGlowMode.value as BoostGlowMode };
  saveSettings(visualSettings);
  syncSettingsUi();
});
snakeVisualMode.addEventListener('change', () => {
  visualSettings = { ...visualSettings, snakeVisual: snakeVisualMode.value as SnakeVisualMode };
  saveSettings(visualSettings);
  syncSettingsUi();
});
foodAnimationMode.addEventListener('change', () => {
  visualSettings = { ...visualSettings, foodAnimation: foodAnimationMode.value as FoodAnimationMode };
  saveSettings(visualSettings);
  syncSettingsUi();
});
controlMode.addEventListener('change', () => {
  visualSettings = { ...visualSettings, controlMode: controlMode.value as ControlMode };
  saveSettings(visualSettings);
  syncSettingsUi();
});
mobileControlMode.addEventListener('change', () => {
  visualSettings = {
    ...visualSettings,
    mobileControlMode: mobileControlMode.value as MobileControlMode,
  };
  saveSettings(visualSettings);
  syncSettingsUi();
});

pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  socket.send({ type: 'dev', paused });
});
godModeButton.addEventListener('click', () => {
  godMode = !godMode;
  godModeButton.textContent = godMode ? 'God On' : 'God Off';
  socket.send({ type: 'dev', godMode });
});
infiniteBoostButton.addEventListener('click', () => {
  infiniteBoost = !infiniteBoost;
  infiniteBoostButton.textContent = infiniteBoost ? 'Boost On' : 'Boost Off';
  socket.send({ type: 'dev', infiniteBoost });
});
clearDeathMassButton.addEventListener('click', () => {
  socket.send({ type: 'dev', clearDeathMass: true });
});
autoCircleButton.addEventListener('click', () => {
  autoCircle = !autoCircle;
  autoCircleButton.textContent = autoCircle ? 'Circle On' : 'Circle Off';
});
window.addEventListener('resize', () => renderer.resize());
window.addEventListener('resize', () => minimap.resize());
window.visualViewport?.addEventListener('resize', () => renderer.resize());
screen.orientation?.addEventListener('change', () => renderer.resize());

const loop = (): void => {
  fpsFrames += 1;
  const now = performance.now();
  if (now - fpsLastUpdate >= 500) {
    const fps = Math.round((fpsFrames * 1000) / (now - fpsLastUpdate));
    fpsValue.textContent = `FPS ${fps}`;
    fpsFrames = 0;
    fpsLastUpdate = now;
  }

  statusText.textContent = socket.connected ? 'Servidor online' : 'Reconectando...';
  playButton.disabled = !socket.connected;

  const drawableSnapshot = interpolateSnapshot(snapshot, previousSnapshot, snapshotReceivedAt);
  if (drawableSnapshot) {
    renderer.draw(drawableSnapshot);
    minimap.draw(drawableSnapshot, selfId, visualSettings.minimap);
  } else {
    context.fillStyle = '#000';
    context.fillRect(
      0,
      0,
      window.visualViewport?.width ?? window.innerWidth,
      window.visualViewport?.height ?? window.innerHeight,
    );
  }

  if (playing) {
    socket.send({
      type: 'input',
      target: getControlTarget(),
      boosting: input.boosting,
    });
  }

  requestAnimationFrame(loop);
};

renderSkins();
syncSelectedSkin();
renderGameMode();
syncSettingsUi();
renderer.resize();
socket.connect();
loop();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {
        // A rede local via HTTP permite jogar, mas alguns navegadores exigem HTTPS para instalar o PWA.
      });
  });
}
