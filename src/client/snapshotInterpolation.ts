import type { SnakeSnapshot, Vector, WorldSnapshot } from '../shared/types';

const INTERPOLATION_WINDOW_MS = 55;

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

const interpolateSnake = (
  previous: SnakeSnapshot | undefined,
  current: SnakeSnapshot,
  amount: number,
): SnakeSnapshot => {
  if (!previous) {
    return current;
  }

  const fallbackTail = previous.segments.at(-1) ?? current.segments.at(-1) ?? current.segments[0];
  return {
    ...current,
    radius: lerp(previous.radius, current.radius, amount),
    angle: lerpAngle(previous.angle, current.angle, amount),
    segments: current.segments.map((segment, index) =>
      lerpPoint(previous.segments[index] ?? fallbackTail, segment, amount),
    ),
  };
};

export const interpolateSnapshot = (
  current: WorldSnapshot | null,
  previous: WorldSnapshot | null,
  receivedAt: number,
  now = performance.now(),
): WorldSnapshot | null => {
  if (!current || !previous) {
    return current;
  }

  const amount = clamp((now - receivedAt) / INTERPOLATION_WINDOW_MS, 0, 1);
  const previousSnakes = new Map(previous.snakes.map((snake) => [snake.id, snake]));
  const previousLeader = previous.leader?.id === current.leader?.id ? previous.leader : null;

  return {
    ...current,
    snakes: current.snakes.map((snake) => interpolateSnake(previousSnakes.get(snake.id), snake, amount)),
    leader: current.leader && previousLeader
      ? {
          ...current.leader,
          position: lerpPoint(previousLeader.position, current.leader.position, amount),
        }
      : current.leader,
  };
};
