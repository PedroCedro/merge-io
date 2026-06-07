import type { Vector } from '../shared/types';

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const distance = (a: Vector, b: Vector): number => Math.hypot(a.x - b.x, a.y - b.y);

export const distanceSquared = (a: Vector, b: Vector): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const lerpAngle = (from: number, to: number, amount: number): number => {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * amount;
};

export const randomPoint = (width: number, height: number, margin = 80): Vector => ({
  x: margin + Math.random() * (width - margin * 2),
  y: margin + Math.random() * (height - margin * 2),
});

export const distancePointToSegment = (point: Vector, a: Vector, b: Vector): number => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const lenSq = abx * abx + aby * aby;

  if (lenSq === 0) {
    return distance(point, a);
  }

  const t = clamp((apx * abx + apy * aby) / lenSq, 0, 1);
  return distance(point, { x: a.x + abx * t, y: a.y + aby * t });
};
