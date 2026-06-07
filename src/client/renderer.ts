import { findSkin, type Food, type Skin, type SnakeSnapshot, type Vector, type WorldSnapshot } from '../shared/types';
import type { BoostGlowMode, SnakeVisualMode } from './settings';
import { getSegmentSprite } from './snakeSprites';

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export class Renderer {
  private camera: Camera = { x: 0, y: 0, zoom: 1 };
  private boostGlowMode: BoostGlowMode = 'basic';
  private snakeVisualMode: SnakeVisualMode = 'slither';
  private currentTick = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: CanvasRenderingContext2D,
  ) {}

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  screenToWorld(point: Vector): Vector {
    return {
      x: this.camera.x + point.x / this.camera.zoom,
      y: this.camera.y + point.y / this.camera.zoom,
    };
  }

  setBoostGlowMode(mode: BoostGlowMode): void {
    this.boostGlowMode = mode;
  }

  setSnakeVisualMode(mode: SnakeVisualMode): void {
    this.snakeVisualMode = mode;
  }

  draw(snapshot: WorldSnapshot): void {
    this.currentTick = snapshot.tick;
    const self = snapshot.snakes.find((snake) => snake.id === snapshot.selfId);
    this.updateCamera(self);

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    this.ctx.save();
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.drawWorld(snapshot);
    snapshot.foods.forEach((food) => this.drawFood(food));
    snapshot.snakes
      .filter((snake) => snake.id !== snapshot.selfId)
      .forEach((snake) => this.drawSnake(snake));
    if (self) {
      this.drawSnake(self);
    }
    this.ctx.restore();
    this.drawNames(snapshot.snakes);
  }

  private updateCamera(self?: SnakeSnapshot): void {
    if (!self) {
      return;
    }

    const head = self.segments[0];
    const targetZoom = Math.max(0.48, Math.min(1.35, 1.45 - self.segments.length / 260));
    this.camera.zoom += (targetZoom - this.camera.zoom) * 0.08;
    this.camera.x += (head.x - window.innerWidth / (2 * this.camera.zoom) - this.camera.x) * 0.16;
    this.camera.y += (head.y - window.innerHeight / (2 * this.camera.zoom) - this.camera.y) * 0.16;
  }

  private drawWorld(snapshot: WorldSnapshot): void {
    const left = -this.camera.x;
    const top = -this.camera.y;
    const viewW = window.innerWidth / this.camera.zoom;
    const viewH = window.innerHeight / this.camera.zoom;

    this.ctx.fillStyle = '#3a2618';
    this.ctx.fillRect(0, 0, viewW, viewH);
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(left, top, snapshot.world.width, snapshot.world.height);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(left, top, snapshot.world.width, snapshot.world.height);
    this.ctx.clip();

    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(left, top, snapshot.world.width, snapshot.world.height);

    this.ctx.fillStyle = 'rgba(255,255,255,0.07)';
    const grid = 120;
    const startX = Math.floor(this.camera.x / grid) * grid;
    const startY = Math.floor(this.camera.y / grid) * grid;
    const endX = this.camera.x + viewW + grid;
    const endY = this.camera.y + viewH + grid;

    for (let x = startX; x < endX; x += grid) {
      for (let y = startY; y < endY; y += grid) {
        this.ctx.beginPath();
        this.ctx.arc(x - this.camera.x, y - this.camera.y, 1.4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  private drawFood(food: Food): void {
    const pulse = 1 + Math.sin(Date.now() * 0.006 + food.x) * 0.16;
    const ageTicks = Math.max(0, this.currentTick - food.spawnTick);
    const deathEnergy = food.source === 'death' ? Math.max(0.38, 1 - ageTicks / 900) : 0;
    const radius = food.radius * pulse * (1 + deathEnergy * 0.65);
    this.ctx.beginPath();
    this.ctx.fillStyle = deathEnergy > 0 ? '#fff' : food.color;
    this.ctx.shadowColor = food.color;
    this.ctx.shadowBlur = 7 + food.radius * 1.8 + deathEnergy * 28;
    this.ctx.arc(food.x - this.camera.x, food.y - this.camera.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    if (deathEnergy > 0) {
      this.ctx.globalAlpha = deathEnergy * 0.72;
      this.ctx.fillStyle = food.color;
      this.ctx.beginPath();
      this.ctx.arc(food.x - this.camera.x, food.y - this.camera.y, radius * 0.72, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }
    this.ctx.shadowBlur = 0;
  }

  private drawSnake(snake: SnakeSnapshot): void {
    const skin = findSkin(snake.skin);
    if (snake.segments.length === 0) {
      return;
    }

    this.ctx.save();

    // No visual Slither, o boost acende os aneis por dentro; no modo
    // performance mantemos um halo simples por baixo.
    if (snake.boosting && this.boostGlowMode !== 'off' && this.snakeVisualMode === 'performance') {
      this.drawBoostGlow(snake, skin.glow);
    }

    if (this.snakeVisualMode === 'performance') {
      this.drawPerformanceBody(snake, skin);
    } else {
      this.drawSlitherBody(snake, skin);
    }
    this.drawHead(snake, skin);
    this.ctx.restore();
  }

  // Desenha o corpo como uma sequencia de discos sobrepostos (sprites com
  // gradiente) distribuidos por distancia ao longo do caminho. Discos proximos
  // se sobrepoem -> sem buracos nas curvas; o rim escuro de cada sprite cria a
  // separacao visual entre segmentos. Desenhado da cauda para a cabeca para que
  // os discos da frente fiquem por cima.
  private drawSlitherBody(snake: SnakeSnapshot, skin: Skin): void {
    const segments = snake.segments;
    const n = segments.length;
    if (n < 2) {
      return;
    }

    const radius = snake.radius;
    const spacing = Math.max(8, radius * 0.85);
    const stripeWidth = Math.max(spacing * 2.2, radius * 2.2);

    // Limites do viewport em coordenadas de mundo-camera (o ctx ja esta
    // escalado pelo zoom). Usado como LOD simples: pula o drawImage de discos
    // fora da tela, barateando cobras longas que saem do quadro.
    const viewW = window.innerWidth / this.camera.zoom;
    const viewH = window.innerHeight / this.camera.zoom;

    let carry = 0; // distancia restante ate o proximo disco ao cruzar segmentos
    let arc = 0; // distancia total percorrida desde a cauda (para listras/taper)

    for (let i = n - 1; i > 0; i -= 1) {
      const a = segments[i]; // mais proximo da cauda
      const b = segments[i - 1]; // mais proximo da cabeca
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.0001) {
        continue;
      }
      const ux = dx / len;
      const uy = dy / len;

      let d = carry;
      while (d < len) {
        const px = a.x + ux * d;
        const py = a.y + uy * d;

        // headness: 0 na cauda, ~1 na cabeca. O Slither afina pouco; o corpo
        // precisa continuar cheio para nao parecer um chicote.
        const headness = 1 - (i - d / len) / n;
        const taper = 0.82 + 0.18 * Math.min(1, headness * 3);
        const r = radius * taper;

        const screenX = px - this.camera.x;
        const screenY = py - this.camera.y;
        if (screenX > -r - 8 && screenX < viewW + r + 8 && screenY > -r - 8 && screenY < viewH + r + 8) {
          const colorIndex = Math.floor(arc / stripeWidth) % skin.body.length;
          const sprite = getSegmentSprite(skin.body[colorIndex], r);
          const half = sprite.width / 2;
          this.ctx.drawImage(sprite, screenX - half, screenY - half);

          if (snake.boosting && this.boostGlowMode !== 'off') {
            this.drawBoostLed(screenX, screenY, r, arc, skin.glow);
          }
        }

        d += spacing;
        arc += spacing;
      }
      carry = d - len;
    }
  }

  private drawBoostLed(x: number, y: number, radius: number, distanceFromTail: number, color: string): void {
    const period = 165;
    const waveWidth = this.boostGlowMode === 'full' ? 72 : 54;
    const phase = (Date.now() * 0.28) % period;
    const offset = (distanceFromTail - phase + period) % period;
    const wave = Math.max(0, 1 - Math.abs(offset - period * 0.5) / waveWidth);
    const baseAlpha = this.boostGlowMode === 'full' ? 0.34 : 0.2;
    const alpha = Math.min(1, baseAlpha + wave * (this.boostGlowMode === 'full' ? 0.66 : 0.48));

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = '#fff';
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = this.boostGlowMode === 'full' ? 16 + wave * 18 : 4 + wave * 10;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * (0.46 + wave * 0.24), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawPerformanceBody(snake: SnakeSnapshot, skin: Skin): void {
    const segments = snake.segments;

    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = skin.glow;
    this.ctx.shadowBlur = snake.boosting && this.boostGlowMode === 'full' ? 16 : 8;

    for (let i = segments.length - 2; i >= 0; i -= 1) {
      const current = segments[i];
      const next = segments[i + 1];
      const taper = Math.max(0.25, 1 - (i / Math.max(segments.length, 1)) * 0.08);
      this.ctx.beginPath();
      this.ctx.moveTo(current.x - this.camera.x, current.y - this.camera.y);
      this.ctx.lineTo(next.x - this.camera.x, next.y - this.camera.y);
      this.ctx.strokeStyle = skin.body[i % skin.body.length];
      this.ctx.lineWidth = snake.radius * 2 * taper;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawBoostGlow(snake: SnakeSnapshot, color: string): void {
    const segments = snake.segments;
    if (segments.length < 2) {
      return;
    }

    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = this.boostGlowMode === 'full' ? 0.32 : 0.18;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = this.boostGlowMode === 'full' ? 20 : 0;
    this.ctx.lineWidth = snake.radius * (this.boostGlowMode === 'full' ? 3.1 : 2.55);

    this.ctx.beginPath();
    this.ctx.moveTo(segments[0].x - this.camera.x, segments[0].y - this.camera.y);
    const step = this.boostGlowMode === 'full' ? 1 : 2;
    for (let i = step; i < segments.length; i += step) {
      this.ctx.lineTo(segments[i].x - this.camera.x, segments[i].y - this.camera.y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawHead(snake: SnakeSnapshot, skin: Skin): void {
    const head = snake.segments[0];
    const radius = snake.radius;

    this.ctx.save();
    this.ctx.translate(head.x - this.camera.x, head.y - this.camera.y);
    this.ctx.rotate(snake.angle);

    // Cabeca arredondada com volume reaproveitando o sprite de disco.
    const sprite = getSegmentSprite(skin.head, radius);
    const half = sprite.width / 2;
    this.ctx.drawImage(sprite, -half, -half);

    // Olhos maiores e mais expressivos, com pupila e brilho.
    const eyeX = radius * 0.5;
    const eyeY = radius * 0.55;
    const eyeRadius = radius * 0.46;
    const pupilRadius = radius * 0.22;

    for (const sign of [-1, 1]) {
      const ex = eyeX;
      const ey = sign * eyeY;

      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(ex, ey, eyeRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#0a0a0a';
      this.ctx.beginPath();
      this.ctx.arc(ex + eyeRadius * 0.42, ey, pupilRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
      this.ctx.beginPath();
      this.ctx.arc(ex + eyeRadius * 0.18, ey - eyeRadius * 0.28, pupilRadius * 0.42, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private drawNames(snakes: SnakeSnapshot[]): void {
    this.ctx.save();
    this.ctx.font = '700 13px Inter, Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#fff';

    for (const snake of snakes) {
      const head = snake.segments[0];
      const x = Math.round((head.x - this.camera.x) * this.camera.zoom);
      const y = Math.round((head.y - this.camera.y - snake.radius - 12) * this.camera.zoom);
      this.ctx.fillText(snake.name, x, y);
    }

    this.ctx.restore();
  }
}
