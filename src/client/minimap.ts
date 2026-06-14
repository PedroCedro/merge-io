import { findSkin, type MinimapMode, type MinimapSnakeSnapshot, type WorldSnapshot } from '../shared/types';

const MAP_SIZE = 142;
const MAP_PADDING = 8;
const UPDATE_INTERVAL_MS = 90;

export class Minimap {
  private readonly ctx: CanvasRenderingContext2D;
  private lastDrawAt = 0;
  private mobilePerformance = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D do minimapa indisponivel');
    }

    this.ctx = context;
    this.resize();
  }

  resize(): void {
    const dpr = this.mobilePerformance ? 1 : window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(MAP_SIZE * dpr);
    this.canvas.height = Math.floor(MAP_SIZE * dpr);
    this.canvas.style.width = `${MAP_SIZE}px`;
    this.canvas.style.height = `${MAP_SIZE}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setMobilePerformance(enabled: boolean): void {
    this.mobilePerformance = enabled;
    this.resize();
  }

  draw(snapshot: WorldSnapshot, selfId: string | null, mode: MinimapMode, force = false): void {
    if (mode === 'off') {
      return;
    }

    const now = performance.now();
    if (!force && now - this.lastDrawAt < UPDATE_INTERVAL_MS) {
      return;
    }

    this.lastDrawAt = now;
    this.ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

    const center = MAP_SIZE / 2;
    const radius = MAP_SIZE / 2 - MAP_PADDING;
    const scale = (radius * 2) / Math.max(snapshot.world.width, snapshot.world.height);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(center, center, radius, 0, Math.PI * 2);
    this.ctx.clip();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    this.ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    this.drawGrid(center, radius);

    const snakes = mode === 'full' ? this.getFullModeSnakes(snapshot) : this.getBasicModeSnakes(snapshot, selfId);
    for (const snake of snakes) {
      this.drawSnake(snake, selfId, snapshot.world.width, snapshot.world.height, center, scale, mode);
    }

    this.ctx.restore();

    this.ctx.beginPath();
    this.ctx.arc(center, center, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
  }

  clear(): void {
    this.ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
    this.lastDrawAt = 0;
  }

  private drawGrid(center: number, radius: number): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.moveTo(center - radius, center);
    this.ctx.lineTo(center + radius, center);
    this.ctx.moveTo(center, center - radius);
    this.ctx.lineTo(center, center + radius);
    this.ctx.stroke();
  }

  private drawSnake(
    snake: MinimapSnakeSnapshot,
    selfId: string | null,
    worldWidth: number,
    worldHeight: number,
    center: number,
    scale: number,
    mode: MinimapMode,
  ): void {
    if (snake.segments.length === 0) {
      return;
    }

    const skin = findSkin(snake.skin);
    const isSelf = snake.id === selfId;
    const offsetX = center - (worldWidth * scale) / 2;
    const offsetY = center - (worldHeight * scale) / 2;

    this.ctx.beginPath();
    snake.segments.forEach((segment, index) => {
      const x = offsetX + segment.x * scale;
      const y = offsetY + segment.y * scale;
      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });

    this.ctx.strokeStyle = isSelf ? skin.head : 'rgba(255, 255, 255, 0.82)';
    this.ctx.lineWidth = mode === 'full' ? Math.max(isSelf ? 2.6 : 1.4, snake.radius * scale * 2.4) : 1.4;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();

    const head = snake.segments[0];
    const headX = offsetX + head.x * scale;
    const headY = offsetY + head.y * scale;
    this.ctx.beginPath();
    this.ctx.arc(headX, headY, isSelf ? 3.2 : 2.1, 0, Math.PI * 2);
    this.ctx.fillStyle = isSelf ? '#fff' : skin.head;
    this.ctx.fill();
  }

  private getFullModeSnakes(snapshot: WorldSnapshot): MinimapSnakeSnapshot[] {
    return snapshot.radarSnakes.length > 0 ? snapshot.radarSnakes : snapshot.snakes;
  }

  private getBasicModeSnakes(snapshot: WorldSnapshot, selfId: string | null): MinimapSnakeSnapshot[] {
    const snakes = this.getFullModeSnakes(snapshot);
    const self = snakes.find((snake) => snake.id === selfId);
    if (!self) {
      return [];
    }

    const head = self.segments[0];
    const tail = self.segments.at(-1) ?? head;
    return [
      {
        ...self,
        segments: [head, tail],
      },
    ];
  }
}
