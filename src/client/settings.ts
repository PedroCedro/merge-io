import type { ControlMode, MinimapMode } from '../shared/types';

export type BoostGlowMode = 'full' | 'basic' | 'off';
export type SnakeVisualMode = 'slither' | 'performance';

export type VisualSettings = {
  minimap: MinimapMode;
  boostGlow: BoostGlowMode;
  snakeVisual: SnakeVisualMode;
  controlMode: ControlMode;
};

const STORAGE_KEY = 'merge-io-visual-settings';

const isMinimapMode = (value: string): value is MinimapMode => ['full', 'basic', 'off'].includes(value);
const isBoostGlowMode = (value: string): value is BoostGlowMode => ['full', 'basic', 'off'].includes(value);
const isSnakeVisualMode = (value: string): value is SnakeVisualMode => ['slither', 'performance'].includes(value);
const isControlMode = (value: string): value is ControlMode => ['mouse', 'keyboard'].includes(value);

export const defaultSettings: VisualSettings = {
  minimap: 'basic',
  boostGlow: 'basic',
  snakeVisual: 'slither',
  controlMode: 'mouse',
};

export const loadSettings = (): VisualSettings => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<VisualSettings>;
    return {
      minimap: saved.minimap && isMinimapMode(saved.minimap) ? saved.minimap : defaultSettings.minimap,
      boostGlow: saved.boostGlow && isBoostGlowMode(saved.boostGlow) ? saved.boostGlow : defaultSettings.boostGlow,
      snakeVisual:
        saved.snakeVisual && isSnakeVisualMode(saved.snakeVisual) ? saved.snakeVisual : defaultSettings.snakeVisual,
      controlMode:
        saved.controlMode && isControlMode(saved.controlMode) ? saved.controlMode : defaultSettings.controlMode,
    };
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = (settings: VisualSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
