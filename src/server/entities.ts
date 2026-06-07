import { nanoid } from 'nanoid';
import type { Food, FoodSource, SkinId, SnakeSnapshot, Vector } from '../shared/types';
import { SNAKE, WORLD } from './config';
import { clamp, lerpAngle, randomPoint } from './math';

export type PlayerInput = {
  target: Vector;
  boosting: boolean;
};

export class SnakeEntity {
  readonly id = nanoid(10);
  readonly name: string;
  readonly skin: SkinId;
  readonly bot: boolean;
  alive = true;
  score = 0;
  angle = Math.random() * Math.PI * 2;
  radius = SNAKE.baseRadius;
  segments: Vector[];
  input: PlayerInput;
  boostFoodDrops: Vector[] = [];
  private headPath: Vector[];
  private segmentCount = SNAKE.initialLength;
  private mass = SNAKE.initialLength * SNAKE.massPerSegment;

  constructor(name: string, skin: SkinId, spawn = randomPoint(WORLD.width, WORLD.height), bot = false) {
    this.name = name.trim().slice(0, 16) || 'Jogador';
    this.skin = skin;
    this.bot = bot;
    this.headPath = Array.from({ length: SNAKE.initialLength * 3 }, (_, index) => ({
      x: spawn.x - Math.cos(this.angle) * index * SNAKE.segmentGap,
      y: spawn.y - Math.sin(this.angle) * index * SNAKE.segmentGap,
    }));
    this.segments = this.sampleHeadPath();
    this.input = {
      target: { x: spawn.x + Math.cos(this.angle) * 200, y: spawn.y + Math.sin(this.angle) * 200 },
      boosting: false,
    };
  }

  get head(): Vector {
    return this.segments[0];
  }

  get length(): number {
    return this.segmentCount;
  }

  get massValue(): number {
    return this.mass;
  }

  grow(amount: number): void {
    this.mass += amount;
    this.score += amount * 10;
  }

  update(dt: number): void {
    this.boostFoodDrops = [];
    const desired = Math.atan2(this.input.target.y - this.head.y, this.input.target.x - this.head.x);
    this.angle = lerpAngle(this.angle, desired, SNAKE.turnLerp);

    const boosting = this.input.boosting && this.mass > this.initialMass();
    const speed = boosting ? SNAKE.boostSpeed : SNAKE.baseSpeed;
    const nextHead = {
      x: this.head.x + Math.cos(this.angle) * speed * dt,
      y: this.head.y + Math.sin(this.angle) * speed * dt,
    };

    this.headPath.unshift(nextHead);

    if (boosting && Math.random() < 0.35) {
      const tail = this.segments.at(-1) ?? this.head;
      this.boostFoodDrops.push({ x: tail.x, y: tail.y });
      this.mass = Math.max(this.initialMass(), this.mass - SNAKE.boostMassCost);
    }

    this.segmentCount = this.segmentCountForMass();
    this.radius = this.radiusForMass();
    const maxPathPoints = Math.max(80, this.segmentCount * 4);
    this.headPath.splice(maxPathPoints);
    this.segments = this.sampleHeadPath();
  }

  snapshot(): SnakeSnapshot {
    return {
      id: this.id,
      name: this.name,
      skin: this.skin,
      bot: this.bot,
      alive: this.alive,
      score: this.score,
      radius: this.radius,
      angle: this.angle,
      boosting: this.input.boosting && this.mass > this.initialMass(),
      segments: this.segments,
    };
  }

  private initialMass(): number {
    return SNAKE.initialLength * SNAKE.massPerSegment;
  }

  private segmentCountForMass(): number {
    return Math.max(SNAKE.initialLength, Math.floor(this.mass / SNAKE.massPerSegment));
  }

  private radiusForMass(): number {
    const progress = (this.mass % SNAKE.massPerSegment) / SNAKE.massPerSegment;
    return clamp(SNAKE.baseRadius + Math.sqrt(this.segmentCount) * 0.28 + progress * 0.85, SNAKE.baseRadius, 24);
  }

  private sampleHeadPath(): Vector[] {
    const sampled: Vector[] = [];

    for (let segmentIndex = 0; segmentIndex < this.segmentCount; segmentIndex += 1) {
      sampled.push(this.pointAtDistance(segmentIndex * SNAKE.segmentGap));
    }

    return sampled;
  }

  private pointAtDistance(targetDistance: number): Vector {
    if (targetDistance <= 0) {
      return { ...this.headPath[0] };
    }

    let traveled = 0;
    for (let i = 0; i < this.headPath.length - 1; i += 1) {
      const current = this.headPath[i];
      const next = this.headPath[i + 1];
      const segmentDistance = Math.hypot(next.x - current.x, next.y - current.y);

      if (traveled + segmentDistance >= targetDistance) {
        const amount = (targetDistance - traveled) / Math.max(segmentDistance, 0.0001);
        return {
          x: current.x + (next.x - current.x) * amount,
          y: current.y + (next.y - current.y) * amount,
        };
      }

      traveled += segmentDistance;
    }

    return { ...(this.headPath.at(-1) ?? this.headPath[0]) };
  }
}

const randomFoodValue = (): number => {
  const roll = Math.random();
  if (roll < 0.68) {
    return 1;
  }
  if (roll < 0.9) {
    return 2;
  }
  if (roll < 0.98) {
    return 3;
  }
  return 4;
};

const foodRadiusForValue = (value: number): number => 3.8 + Math.sqrt(value) * 2.2;

export const createFood = (
  position = randomPoint(WORLD.width, WORLD.height),
  value = randomFoodValue(),
  source: FoodSource = 'ambient',
  spawnTick = 0,
): Food => {
  const colors = ['#5cf2ff', '#8fff5c', '#ffdf5c', '#ff6b9d', '#b76bff'];
  return {
    id: nanoid(8),
    x: position.x,
    y: position.y,
    value,
    radius: foodRadiusForValue(value),
    color: colors[Math.floor(Math.random() * colors.length)],
    source,
    spawnTick,
  };
};
