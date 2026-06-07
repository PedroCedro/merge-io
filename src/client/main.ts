import './styles.css';
import { SKINS, type ControlMode, type GameMode, type MinimapMode, type SkinId, type SnakeSnapshot, type Vector, type WorldSnapshot } from '../shared/types';
import { InputController } from './input';
import { Minimap } from './minimap';
import { GameSocket } from './network';
import { Renderer } from './renderer';
import { loadSettings, saveSettings, type BoostGlowMode, type SnakeVisualMode } from './settings';

const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas');
const startMenu = document.querySelector<HTMLElement>('#startMenu');
const playButton = document.querySelector<HTMLButtonElement>('#playButton');
const menuSettingsButton = document.querySelector<HTMLButtonElement>('#menuSettingsButton');
const playerName = document.querySelector<HTMLInputElement>('#playerName');
const modeSelector = document.querySelector<HTMLElement>('#modeSelector');
const skinGrid = document.querySelector<HTMLElement>('#skinGrid');
const statusText = document.querySelector<HTMLElement>('#connectionStatus');
const hud = document.querySelector<HTMLElement>('#hud');
const minimapPanel = document.querySelector<HTMLElement>('#minimapPanel');
const minimapCanvas = document.querySelector<HTMLCanvasElement>('#minimapCanvas');
const leaderboard = document.querySelector<HTMLElement>('#leaderboard');
const leaderboardList = document.querySelector<HTMLOListElement>('#leaderboardList');
const scoreValue = document.querySelector<HTMLElement>('#scoreValue');
const lengthValue = document.querySelector<HTMLElement>('#lengthValue');
const gameOverText = document.querySelector<HTMLElement>('#gameOverText');
const settingsButton = document.querySelector<HTMLButtonElement>('#settingsButton');
const settingsPanel = document.querySelector<HTMLElement>('#settingsPanel');
const settingsBackButton = document.querySelector<HTMLButtonElement>('#settingsBackButton');
const minimapMode = document.querySelector<HTMLSelectElement>('#minimapMode');
const boostGlowMode = document.querySelector<HTMLSelectElement>('#boostGlowMode');
const snakeVisualMode = document.querySelector<HTMLSelectElement>('#snakeVisualMode');
const controlMode = document.querySelector<HTMLSelectElement>('#controlMode');
const devControls = document.querySelector<HTMLElement>('#devControls');
const fpsValue = document.querySelector<HTMLElement>('#fpsValue');
const pauseButton = document.querySelector<HTMLButtonElement>('#pauseButton');
const godModeButton = document.querySelector<HTMLButtonElement>('#godModeButton');
const autoCircleButton = document.querySelector<HTMLButtonElement>('#autoCircleButton');

if (
  !canvas ||
  !startMenu ||
  !playButton ||
  !menuSettingsButton ||
  !playerName ||
  !modeSelector ||
  !skinGrid ||
  !statusText ||
  !hud ||
  !minimapPanel ||
  !minimapCanvas ||
  !leaderboard ||
  !leaderboardList ||
  !scoreValue ||
  !lengthValue ||
  !gameOverText ||
  !settingsButton ||
  !settingsPanel ||
  !settingsBackButton ||
  !minimapMode ||
  !boostGlowMode ||
  !snakeVisualMode ||
  !controlMode ||
  !devControls ||
  !fpsValue ||
  !pauseButton ||
  !godModeButton ||
  !autoCircleButton
) {
  throw new Error('Merge.IO UI incompleta');
}

const context = canvas.getContext('2d');
if (!context) {
  throw new Error('Canvas 2D indisponivel');
}

let selectedSkin: SkinId = SKINS[0].id;
let selectedGameMode: GameMode = 'ai';
let paused = false;
let godMode = false;
let autoCircle = false;
let autoCircleAngle = 0;
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
let visualSettings = loadSettings();

const renderSkins = (): void => {
  skinGrid.innerHTML = '';
  for (const skin of SKINS) {
    const button = document.createElement('button');
    button.className = `skinButton${skin.id === selectedSkin ? ' active' : ''}`;
    button.type = 'button';
    button.title = skin.name;
    button.innerHTML = `<span class="skinSwatch" style="background: linear-gradient(90deg, ${skin.body.join(', ')})"></span>${skin.name}`;
    button.addEventListener('click', () => {
      selectedSkin = skin.id;
      renderSkins();
    });
    skinGrid.appendChild(button);
  }
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
  controlMode.value = visualSettings.controlMode;
  renderer.setBoostGlowMode(visualSettings.boostGlow);
  renderer.setSnakeVisualMode(visualSettings.snakeVisual);
  minimapPanel.classList.toggle('disabled', visualSettings.minimap === 'off');
  if (visualSettings.minimap === 'off') {
    minimap.clear();
  }
};

const openSettings = (): void => {
  if (!playing) {
    startMenu.classList.add('hidden');
  }
  settingsPanel.classList.remove('hidden');
};

const closeSettings = (): void => {
  settingsPanel.classList.add('hidden');
  if (!playing) {
    startMenu.classList.remove('hidden');
  }
};

const join = (): void => {
  if (!socket.connected) {
    return;
  }

  socket.send({
    type: 'join',
    name: playerName.value,
    skin: selectedSkin,
    gameMode: selectedGameMode,
    minimapMode: visualSettings.minimap,
  });
  startMenu.classList.add('hidden');
  gameOverText.textContent = '';
  hud.classList.remove('hidden');
  minimapPanel.classList.remove('hidden');
  leaderboard.classList.remove('hidden');
  devControls.classList.remove('hidden');
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
    autoCircleAngle += 0.045;
    return {
      x: head.x + Math.cos(autoCircleAngle) * 340,
      y: head.y + Math.sin(autoCircleAngle) * 340,
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

  const dx = input.target.x - window.innerWidth / 2;
  const dy = input.target.y - window.innerHeight / 2;
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

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;

const lerpAngle = (from: number, to: number, amount: number): number => {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * amount;
};

const lerpPoint = (from: Vector, to: Vector, amount: number): Vector => ({
  x: lerp(from.x, to.x, amount),
  y: lerp(from.y, to.y, amount),
});

const interpolateSnake = (from: SnakeSnapshot | undefined, to: SnakeSnapshot, amount: number): SnakeSnapshot => {
  if (!from) {
    return to;
  }

  const fallbackTail = from.segments.at(-1) ?? to.segments.at(-1) ?? to.segments[0];

  return {
    ...to,
    radius: lerp(from.radius, to.radius, amount),
    angle: lerpAngle(from.angle, to.angle, amount),
    boosting: to.boosting,
    segments: to.segments.map((segment, index) => lerpPoint(from.segments[index] ?? fallbackTail, segment, amount)),
  };
};

const getDrawableSnapshot = (): WorldSnapshot | null => {
  if (!snapshot) {
    return null;
  }

  if (!previousSnapshot) {
    return snapshot;
  }

  const amount = clamp((performance.now() - snapshotReceivedAt) / 55, 0, 1);
  const previousById = new Map(previousSnapshot.snakes.map((snake) => [snake.id, snake]));

  return {
    ...snapshot,
    snakes: snapshot.snakes.map((snake) => interpolateSnake(previousById.get(snake.id), snake, amount)),
  };
};

socket.onMessage((message) => {
  if (message.type === 'welcome') {
    selfId = message.id;
    previousSnapshot = null;
    snapshot = message.snapshot;
    snapshotReceivedAt = performance.now();
  }

  if (message.type === 'state') {
    previousSnapshot = snapshot;
    snapshot = message.snapshot;
    snapshotReceivedAt = performance.now();
  }

  if (message.type === 'dead') {
    playing = false;
    gameOverText.textContent = `${message.reason}. Pontos: ${message.score}`;
    startMenu.classList.remove('hidden');
    hud.classList.add('hidden');
    minimapPanel.classList.add('hidden');
    leaderboard.classList.add('hidden');
    devControls.classList.add('hidden');
    selfId = null;
  }

  updateHud();
});

playButton.addEventListener('click', join);
settingsButton.addEventListener('click', () => {
  if (settingsPanel.classList.contains('hidden')) {
    openSettings();
  } else {
    closeSettings();
  }
});
menuSettingsButton.addEventListener('click', openSettings);
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
controlMode.addEventListener('change', () => {
  visualSettings = { ...visualSettings, controlMode: controlMode.value as ControlMode };
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
autoCircleButton.addEventListener('click', () => {
  autoCircle = !autoCircle;
  autoCircleButton.textContent = autoCircle ? 'Circle On' : 'Circle Off';
});
window.addEventListener('resize', () => renderer.resize());
window.addEventListener('resize', () => minimap.resize());

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

  const drawableSnapshot = getDrawableSnapshot();
  if (drawableSnapshot) {
    renderer.draw(drawableSnapshot);
    minimap.draw(drawableSnapshot, selfId, visualSettings.minimap);
  } else {
    context.fillStyle = '#000';
    context.fillRect(0, 0, window.innerWidth, window.innerHeight);
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
renderGameMode();
syncSettingsUi();
renderer.resize();
socket.connect();
loop();
