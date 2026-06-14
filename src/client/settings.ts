import type { ControlMode, MinimapMode } from '../shared/types';

export type BoostGlowMode = 'full' | 'basic' | 'off';
export type SnakeVisualMode = 'slither' | 'performance';
export type FoodAnimationMode = 'static' | 'pulse';
export type MobileControlMode = 'touch' | 'joystick';

export type VisualSettings = {
  minimap: MinimapMode;
  boostGlow: BoostGlowMode;
  snakeVisual: SnakeVisualMode;
  foodAnimation: FoodAnimationMode;
  controlMode: ControlMode;
  mobileControlMode: MobileControlMode;
};

const STORAGE_KEY = 'merge-io-visual-settings';

const isMinimapMode = (value: string): value is MinimapMode => ['full', 'basic', 'off'].includes(value);
const isBoostGlowMode = (value: string): value is BoostGlowMode => ['full', 'basic', 'off'].includes(value);
const isSnakeVisualMode = (value: string): value is SnakeVisualMode => ['slither', 'performance'].includes(value);
const isFoodAnimationMode = (value: string): value is FoodAnimationMode => ['static', 'pulse'].includes(value);
const isControlMode = (value: string): value is ControlMode => ['mouse', 'keyboard'].includes(value);
const isMobileControlMode = (value: string): value is MobileControlMode => ['touch', 'joystick'].includes(value);

export const defaultSettings: VisualSettings = {
  minimap: 'basic',
  boostGlow: 'basic',
  snakeVisual: 'slither',
  foodAnimation: 'static',
  controlMode: 'mouse',
  mobileControlMode: 'touch',
};

export const loadSettings = (): VisualSettings => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<VisualSettings>;
    return {
      minimap: saved.minimap && isMinimapMode(saved.minimap) ? saved.minimap : defaultSettings.minimap,
      boostGlow: saved.boostGlow && isBoostGlowMode(saved.boostGlow) ? saved.boostGlow : defaultSettings.boostGlow,
      snakeVisual:
        saved.snakeVisual && isSnakeVisualMode(saved.snakeVisual) ? saved.snakeVisual : defaultSettings.snakeVisual,
      foodAnimation:
        saved.foodAnimation && isFoodAnimationMode(saved.foodAnimation)
          ? saved.foodAnimation
          : defaultSettings.foodAnimation,
      controlMode:
        saved.controlMode && isControlMode(saved.controlMode) ? saved.controlMode : defaultSettings.controlMode,
      mobileControlMode:
        saved.mobileControlMode && isMobileControlMode(saved.mobileControlMode)
          ? saved.mobileControlMode
          : defaultSettings.mobileControlMode,
    };
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = (settings: VisualSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
