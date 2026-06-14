import { SKINS, type Food, type LeaderboardEntry, type MinimapMode, type SkinId, type Vector, type WorldSnapshot } from '../shared/types';
import { BOTS, NETWORK, SNAKE, TICK_RATE, WORLD } from './config';
import { createFood, SnakeEntity } from './entities';
import { distance, distancePointToSegment, distanceSquared, randomPoint } from './math';

export class GameWorld {
  readonly snakes = new Map<string, SnakeEntity>();
  readonly foods = new Map<string, Food>();
  tick = 0;
  paused = false;
  private aiMode = false;
  private godSnakeIds = new Set<string>();

  constructor() {
    for (let i = 0; i < WORLD.initialFood; i += 1) {
      const food = createFood(undefined, undefined, 'ambient', this.tick);
      this.foods.set(food.id, food);
    }
  }

  setAiMode(enabled: boolean): void {
    if (this.aiMode === enabled) {
      return;
    }

    this.aiMode = enabled;
    if (enabled) {
      this.ensureBots();
      return;
    }

    const botIds = [...this.snakes.values()].filter((snake) => snake.bot).map((snake) => snake.id);
    for (const id of botIds) {
      this.removeSnake(id);
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setGodMode(id: string, enabled: boolean): void {
    if (enabled) {
      this.godSnakeIds.add(id);
      return;
    }

    this.godSnakeIds.delete(id);
  }

  setInfiniteBoost(id: string, enabled: boolean): void {
    const snake = this.snakes.get(id);
    if (snake) {
      snake.infiniteBoost = enabled;
    }
  }

  clearDeathMass(): void {
    for (const [id, food] of this.foods) {
      if (food.source === 'death') {
        this.foods.delete(id);
      }
    }
  }

  addSnake(name: string, skin: SkinId): SnakeEntity {
    const snake = new SnakeEntity(name, skin, this.safeSpawn());
    this.snakes.set(snake.id, snake);
    return snake;
  }

  removeSnake(id: string): void {
    const snake = this.snakes.get(id);
    if (snake) {
      this.dropFoodFromSnake(snake);
    }
    this.snakes.delete(id);
  }

  update(): Map<string, number> {
    const dead = new Map<string, number>();
    if (this.paused) {
      return dead;
    }

    const dt = 1 / TICK_RATE;

    if (this.aiMode) {
      this.updateBots();
    }

    for (const snake of this.snakes.values()) {
      if (!snake.alive) {
        continue;
      }
      snake.update(dt);
      this.dropBoostFood(snake);
      this.resolveFood(snake);
    }

    for (const snake of this.snakes.values()) {
      if (snake.alive && !this.godSnakeIds.has(snake.id) && this.hasFatalCollision(snake)) {
        snake.alive = false;
        dead.set(snake.id, Math.floor(snake.score));
        this.dropFoodFromSnake(snake);
      }
    }

    for (const id of dead.keys()) {
      this.snakes.delete(id);
      this.godSnakeIds.delete(id);
    }

    if (WORLD.replenishFood) {
      while (this.foods.size < WORLD.maxFood) {
        const food = createFood(undefined, undefined, 'ambient', this.tick);
        this.foods.set(food.id, food);
      }
    }

    if (this.aiMode) {
      this.ensureBots();
    }
    this.tick += 1;
    return dead;
  }

  snapshotFor(
    selfId: string | null,
    minimapMode: MinimapMode = 'basic',
    spectatorCenter?: Vector,
  ): WorldSnapshot {
    const self = selfId ? this.snakes.get(selfId) : null;
    const center = self?.head ?? spectatorCenter ?? { x: WORLD.width / 2, y: WORLD.height / 2 };
    const length = self?.length ?? SNAKE.initialLength;
    const areaOfInterest = Math.min(NETWORK.areaOfInterestMax, NETWORK.areaOfInterest + length * 10);
    const foodLimit = Math.min(
      NETWORK.foodLimitPerClientMax,
      NETWORK.foodLimitPerClient + length * NETWORK.foodLimitPerSegment,
    );
    const areaSq = areaOfInterest * areaOfInterest;

    const snakes = [...this.snakes.values()]
      .filter((snake) => snake.id === selfId || distanceSquared(center, snake.head) <= areaSq)
      .map((snake) => snake.snapshot());

    const foods = [...this.foods.values()]
      .filter((food) => distanceSquared(center, food) <= areaSq)
      .sort((a, b) => distanceSquared(center, a) - distanceSquared(center, b))
      .slice(0, foodLimit);

    return {
      selfId,
      tick: this.tick,
      world: {
        width: WORLD.width,
        height: WORLD.height,
      },
      snakes,
      radarSnakes: this.radarSnakes(minimapMode, selfId),
      foods,
      leaderboard: this.leaderboard(),
    };
  }

  leaderboard(): LeaderboardEntry[] {
    return [...this.snakes.values()]
      .sort((a, b) => b.score - a.score || b.length - a.length)
      .slice(0, NETWORK.leaderboardSize)
      .map((snake) => ({
        id: snake.id,
        name: snake.name,
        score: Math.floor(snake.score),
        length: snake.length,
        skin: snake.skin,
      }));
  }

  private resolveFood(snake: SnakeEntity): void {
    let regularFoodPickedUp = 0;
    let deathFoodPickedUp = 0;
    let consumedMass = 0;

    for (const food of this.foods.values()) {
      const pickupDistance = snake.radius + food.radius + SNAKE.foodPickupRadius * 0.45;
      if (distanceSquared(snake.head, food) > pickupDistance * pickupDistance) {
        continue;
      }

      if (food.source === 'death') {
        if (deathFoodPickedUp >= SNAKE.maxDeathFoodPickupsPerTick) {
          continue;
        }
        deathFoodPickedUp += 1;
      } else if (regularFoodPickedUp >= SNAKE.maxFoodPickupsPerTick) {
        continue;
      } else {
        regularFoodPickedUp += 1;
      }

      consumedMass += food.value;
      this.foods.delete(food.id);
    }

    if (consumedMass > 0) {
      snake.grow(consumedMass);
    }
  }

  private hasFatalCollision(snake: SnakeEntity): boolean {
    if (snake.head.x < 0 || snake.head.y < 0 || snake.head.x > WORLD.width || snake.head.y > WORLD.height) {
      return true;
    }

    for (const other of this.snakes.values()) {
      if (other.id === snake.id || !other.alive) {
        continue;
      }

      const otherBodyReach = other.length * SNAKE.segmentGap + snake.radius + other.radius;
      if (distanceSquared(snake.head, other.head) > otherBodyReach * otherBodyReach) {
        continue;
      }

      for (let i = 8; i < other.segments.length - 1; i += 1) {
        const hitDistance = distancePointToSegment(snake.head, other.segments[i], other.segments[i + 1]);
        if (hitDistance < snake.radius + other.radius - SNAKE.collisionPadding) {
          return true;
        }
      }
    }

    return false;
  }

  private dropFoodFromSnake(snake: SnakeEntity): void {
    const droppedMass = Math.max(snake.length, Math.floor(snake.massValue));
    const particleCount = Math.ceil(droppedMass / WORLD.deathFoodValue);
    for (let particleIndex = 0; particleIndex < particleCount; particleIndex += 1) {
      const pathLength = Math.max(1, snake.segments.length - 1);
      const pathPosition = ((particleIndex + Math.random()) / particleCount) * pathLength;
      const segmentIndex = Math.floor(pathPosition);
      const nextIndex = Math.min(segmentIndex + 1, snake.segments.length - 1);
      const amount = pathPosition - segmentIndex;
      const segment = snake.segments[segmentIndex] ?? snake.head;
      const next = snake.segments[nextIndex] ?? segment;

      const centerX = segment.x + (next.x - segment.x) * amount;
      const centerY = segment.y + (next.y - segment.y) * amount;
      const spread = snake.radius * Math.sqrt(Math.random()) * 0.48;
      const angle = Math.random() * Math.PI * 2;
      const position = {
        x: centerX + Math.cos(angle) * spread,
        y: centerY + Math.sin(angle) * spread,
      };
      const remainingMass = droppedMass - particleIndex * WORLD.deathFoodValue;
      const food = createFood(position, Math.min(WORLD.deathFoodValue, remainingMass), 'death', this.tick);
      this.foods.set(food.id, food);
    }
  }

  private dropBoostFood(snake: SnakeEntity): void {
    for (const position of snake.boostFoodDrops) {
      const food = createFood(position, 1, 'boost', this.tick);
      this.foods.set(food.id, food);
    }
  }

  private radarSnakes(mode: MinimapMode, selfId: string | null): WorldSnapshot['radarSnakes'] {
    if (mode === 'off') {
      return [];
    }

    const snakes = mode === 'basic' && selfId ? [this.snakes.get(selfId)].filter((snake) => snake !== undefined) : [...this.snakes.values()];

    return snakes.map((snake) => ({
      id: snake.id,
      skin: snake.skin,
      radius: snake.radius,
      segments: snake.segments.filter((_, index) => index % NETWORK.minimapSegmentStep === 0),
    }));
  }

  private safeSpawn(): { x: number; y: number } {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const point = randomPoint(WORLD.width, WORLD.height, 220);
      const tooClose = [...this.snakes.values()].some((snake) => distance(point, snake.head) < 520);
      if (!tooClose) {
        return point;
      }
    }

    return randomPoint(WORLD.width, WORLD.height, 220);
  }

  private ensureBots(): void {
    const botCount = [...this.snakes.values()].filter((snake) => snake.bot).length;

    for (let i = botCount; i < BOTS.targetCount; i += 1) {
      const skin = SKINS[Math.floor(Math.random() * SKINS.length)].id;
      const name = BOTS.names[Math.floor(Math.random() * BOTS.names.length)];
      const bot = new SnakeEntity(`${name}-${Math.floor(Math.random() * 90 + 10)}`, skin, this.safeSpawn(), true);
      this.snakes.set(bot.id, bot);
    }
  }

  private updateBots(): void {
    for (const bot of this.snakes.values()) {
      if (!bot.bot || !bot.alive) {
        continue;
      }

      const dangerTarget = this.findDangerTarget(bot);
      if (dangerTarget) {
        bot.input = {
          target: {
            x: bot.head.x + (bot.head.x - dangerTarget.x) * 4,
            y: bot.head.y + (bot.head.y - dangerTarget.y) * 4,
          },
          boosting: true,
        };
        continue;
      }

      const foodTarget = this.findNearestFood(bot.head, BOTS.foodScanRadius);
      if (foodTarget) {
        bot.input = {
          target: foodTarget,
          boosting: false,
        };
        continue;
      }

      bot.input = {
        target: this.roamTarget(bot),
        boosting: false,
      };
    }
  }

  private findDangerTarget(bot: SnakeEntity): Vector | null {
    if (
      bot.head.x < BOTS.wallMargin ||
      bot.head.y < BOTS.wallMargin ||
      bot.head.x > WORLD.width - BOTS.wallMargin ||
      bot.head.y > WORLD.height - BOTS.wallMargin
    ) {
      return {
        x: bot.head.x < WORLD.width / 2 ? 0 : WORLD.width,
        y: bot.head.y < WORLD.height / 2 ? 0 : WORLD.height,
      };
    }

    let closest: Vector | null = null;
    let closestDistance = BOTS.dangerRadius;

    for (const other of this.snakes.values()) {
      if (other.id === bot.id || !other.alive) {
        continue;
      }

      for (let i = 0; i < other.segments.length; i += 3) {
        const segment = other.segments[i];
        const d = distance(bot.head, segment);
        if (d < closestDistance) {
          closestDistance = d;
          closest = segment;
        }
      }
    }

    return closest;
  }

  private findNearestFood(origin: Vector, radius: number): Food | null {
    let closest: Food | null = null;
    let closestDistanceSq = radius * radius;
    let checked = 0;

    for (const food of this.foods.values()) {
      checked += 1;
      if (checked % 3 !== this.tick % 3) {
        continue;
      }

      const d = distanceSquared(origin, food);
      if (d < closestDistanceSq) {
        closestDistanceSq = d;
        closest = food;
      }
    }

    return closest;
  }

  private roamTarget(bot: SnakeEntity): Vector {
    const angle = bot.angle + (Math.random() - 0.5) * 0.55;
    return {
      x: bot.head.x + Math.cos(angle) * BOTS.roamDistance,
      y: bot.head.y + Math.sin(angle) * BOTS.roamDistance,
    };
  }
}
