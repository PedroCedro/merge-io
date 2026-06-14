import { findSkin, type Food, type Skin, type SnakeSnapshot, type Vector, type WorldSnapshot } from '../shared/types';
import type { BoostGlowMode, FoodAnimationMode, SnakeVisualMode } from './settings';
import { getDeathFoodSprite, getSegmentSprite } from './snakeSprites';

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export class Renderer {
  private camera: Camera = { x: 0, y: 0, zoom: 1 };
  private boostGlowMode: BoostGlowMode = 'basic';
  private snakeVisualMode: SnakeVisualMode = 'slither';
  private foodAnimationMode: FoodAnimationMode = 'static';
  private currentTick = 0;
  private mobilePerformance = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: CanvasRenderingContext2D,
  ) {}

  resize(): void {
    const width = this.viewportWidth();
    const height = this.viewportHeight();
    const dpr = this.mobilePerformance ? Math.min(window.devicePixelRatio || 1, 1.25) : window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
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

  setFoodAnimationMode(mode: FoodAnimationMode): void {
    this.foodAnimationMode = mode;
  }

  setMobilePerformance(enabled: boolean): void {
    this.mobilePerformance = enabled;
    this.resize();
  }

  draw(snapshot: WorldSnapshot): void {
    this.currentTick = snapshot.tick;
    const self = snapshot.snakes.find((snake) => snake.id === snapshot.selfId);
    this.updateCamera(self);

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.viewportWidth(), this.viewportHeight());

    this.ctx.save();
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.drawWorld(snapshot);
    this.drawFoods(snapshot.foods);
    this.drawDeathFood(snapshot.foods);
    snapshot.snakes
      .filter((snake) => snake.id !== snapshot.selfId)
      .forEach((snake) => this.drawSnake(snake));
    if (self) {
      this.drawSnake(self);
    }
    this.ctx.restore();
    this.drawNames(snapshot.snakes);
    this.drawLeaderIndicator(snapshot);
  }

  private updateCamera(self?: SnakeSnapshot): void {
    if (!self) {
      return;
    }

    const head = self.segments[0];
    const targetZoom = Math.max(0.48, Math.min(1.35, 1.45 - self.segments.length / 260));
    this.camera.zoom += (targetZoom - this.camera.zoom) * 0.08;
    this.camera.x += (head.x - this.viewportWidth() / (2 * this.camera.zoom) - this.camera.x) * 0.16;
    this.camera.y += (head.y - this.viewportHeight() / (2 * this.camera.zoom) - this.camera.y) * 0.16;
  }

  private drawWorld(snapshot: WorldSnapshot): void {
    const left = -this.camera.x;
    const top = -this.camera.y;
    const viewW = this.viewportWidth() / this.camera.zoom;
    const viewH = this.viewportHeight() / this.camera.zoom;

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

  private drawFoods(foods: Food[]): void {
    const foodsByColor = new Map<string, Food[]>();
    for (const food of foods) {
      if (food.source === 'death' || !this.isVisible(food.x, food.y, food.radius + 2)) {
        continue;
      }
      const group = foodsByColor.get(food.color);
      if (group) {
        group.push(food);
      } else {
        foodsByColor.set(food.color, [food]);
      }
    }

    const now = Date.now();
    for (const [color, group] of foodsByColor) {
      this.ctx.beginPath();
      this.ctx.fillStyle = color;
      for (const food of group) {
        const pulse = this.foodAnimationMode === 'pulse'
          ? 1 + Math.sin(now * 0.006 + food.x) * 0.16
          : 1;
        this.ctx.moveTo(food.x - this.camera.x + food.radius * pulse, food.y - this.camera.y);
        this.ctx.arc(food.x - this.camera.x, food.y - this.camera.y, food.radius * pulse, 0, Math.PI * 2);
      }
      this.ctx.fill();
    }
  }

  private drawDeathFood(foods: Food[]): void {
    if (this.mobilePerformance) {
      this.drawMobileDeathFood(foods);
      return;
    }

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';

    for (const food of foods) {
      if (food.source !== 'death') continue;

      const x = food.x - this.camera.x;
      const y = food.y - this.camera.y;
      const ageTicks = Math.max(0, this.currentTick - food.spawnTick);
      const appear = Math.min(1, ageTicks / 7);
      const radius = food.radius * 1.9;
      if (!this.isVisible(food.x, food.y, radius * 1.65)) {
        continue;
      }

      const sprite = getDeathFoodSprite(food.color, radius);
      this.ctx.globalAlpha = appear;
      this.ctx.drawImage(sprite, x - sprite.width / 2, y - sprite.height / 2);
    }

    this.ctx.globalAlpha = 1;
    this.ctx.restore();
  }

  private drawMobileDeathFood(foods: Food[]): void {
    for (const food of foods) {
      if (food.source !== 'death' || !this.isVisible(food.x, food.y, food.radius * 2)) {
        continue;
      }

      this.ctx.fillStyle = food.color;
      this.ctx.globalAlpha = 0.9;
      this.ctx.beginPath();
      this.ctx.arc(
        food.x - this.camera.x,
        food.y - this.camera.y,
        food.radius * 1.35,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawSnake(snake: SnakeSnapshot): void {
    const skin = findSkin(snake.skin);
    if (snake.segments.length === 0) {
      return;
    }
    const head = snake.segments[0];
    const tail = snake.segments.at(-1) ?? head;
    const reach = snake.segments.length * 12 + snake.radius;
    if (!this.isVisible(head.x, head.y, reach) && !this.isVisible(tail.x, tail.y, snake.radius)) {
      return;
    }

    this.ctx.save();

    // No visual Slither, o boost acende os aneis por dentro; no modo
    // performance mantemos um halo simples por baixo.
    if (snake.boosting && this.boostGlowMode !== 'off' && this.snakeVisualMode === 'performance') {
      this.drawBoostGlow(snake, skin.glow);
    }

    if (this.mobilePerformance) {
      this.drawMobileBody(snake, skin);
    } else if (this.snakeVisualMode === 'performance') {
      this.drawPerformanceBody(snake, skin);
    } else {
      this.drawSlitherBody(snake, skin);
    }
    this.drawHead(snake, skin);
    this.ctx.restore();
  }

  private drawMobileBody(snake: SnakeSnapshot, skin: Skin): void {
    const segments = snake.segments;
    if (segments.length < 2) {
      return;
    }

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = skin.body[0];
    this.ctx.lineWidth = snake.radius * 2;
    this.ctx.beginPath();
    this.ctx.moveTo(segments[0].x - this.camera.x, segments[0].y - this.camera.y);
    for (let index = 2; index < segments.length; index += 2) {
      this.ctx.lineTo(segments[index].x - this.camera.x, segments[index].y - this.camera.y);
    }
    const tail = segments.at(-1);
    if (tail) {
      this.ctx.lineTo(tail.x - this.camera.x, tail.y - this.camera.y);
    }
    this.ctx.stroke();

    if (skin.body.length > 1) {
      this.ctx.globalAlpha = 0.48;
      this.ctx.strokeStyle = skin.body[1];
      this.ctx.lineWidth = Math.max(2, snake.radius * 0.72);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    }
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
    const viewW = this.viewportWidth() / this.camera.zoom;
    const viewH = this.viewportHeight() / this.camera.zoom;

    let carry = 0; // distancia restante ate o proximo disco ao cruzar segmentos
    let arc = 0; // distancia total percorrida desde a cauda (para listras)

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

        const r = radius;

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
      this.ctx.beginPath();
      this.ctx.moveTo(current.x - this.camera.x, current.y - this.camera.y);
      this.ctx.lineTo(next.x - this.camera.x, next.y - this.camera.y);
      this.ctx.strokeStyle = skin.body[i % skin.body.length];
      this.ctx.lineWidth = snake.radius * 2;
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
      if (x < -120 || y < -30 || x > this.viewportWidth() + 120 || y > this.viewportHeight() + 30) {
        continue;
      }
      this.ctx.fillText(snake.name, x, y);
    }

    this.ctx.restore();
  }

  private drawLeaderIndicator(snapshot: WorldSnapshot): void {
    const leader = snapshot.leader;
    if (!leader) {
      return;
    }

    const visibleLeader = snapshot.snakes.find((snake) => snake.id === leader.id);
    const screenX = (leader.position.x - this.camera.x) * this.camera.zoom;
    const screenY = (leader.position.y - this.camera.y) * this.camera.zoom;
    const width = this.viewportWidth();
    const height = this.viewportHeight();
    const edgePadding = 44;
    const isOnScreen = screenX >= edgePadding
      && screenY >= edgePadding
      && screenX <= width - edgePadding
      && screenY <= height - edgePadding;

    if (isOnScreen) {
      const radius = (visibleLeader?.radius ?? 12) * this.camera.zoom;
      this.drawCrown(screenX, screenY - radius - 24, 18);
      return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const dx = screenX - centerX;
    const dy = screenY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.001) {
      return;
    }

    const scale = Math.min(
      (centerX - edgePadding) / Math.max(Math.abs(dx), 0.001),
      (centerY - edgePadding) / Math.max(Math.abs(dy), 0.001),
    );
    const markerX = centerX + dx * scale;
    const markerY = centerY + dy * scale;
    const angle = Math.atan2(dy, dx);

    this.ctx.save();
    this.ctx.translate(markerX, markerY);
    this.ctx.rotate(angle);
    this.ctx.fillStyle = '#ffd84d';
    if (!this.mobilePerformance) {
      this.ctx.shadowColor = 'rgba(255, 208, 45, 0.75)';
      this.ctx.shadowBlur = 10;
    }
    this.ctx.beginPath();
    this.ctx.moveTo(15, 0);
    this.ctx.lineTo(2, -8);
    this.ctx.lineTo(2, 8);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    this.drawCrown(
      markerX - Math.cos(angle) * 13,
      markerY - Math.sin(angle) * 13,
      14,
    );
  }

  private drawCrown(x: number, y: number, size: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.fillStyle = '#ffd84d';
    this.ctx.strokeStyle = '#8a5a00';
    this.ctx.lineWidth = Math.max(1.2, size * 0.09);
    if (!this.mobilePerformance) {
      this.ctx.shadowColor = 'rgba(255, 208, 45, 0.72)';
      this.ctx.shadowBlur = size * 0.55;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(-size, -size * 0.35);
    this.ctx.lineTo(-size * 0.55, size * 0.15);
    this.ctx.lineTo(-size * 0.2, -size * 0.65);
    this.ctx.lineTo(size * 0.2, size * 0.15);
    this.ctx.lineTo(size * 0.65, -size * 0.65);
    this.ctx.lineTo(size, -size * 0.35);
    this.ctx.lineTo(size * 0.78, size * 0.55);
    this.ctx.lineTo(-size * 0.78, size * 0.55);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#fff3a8';
    for (const jewelX of [-0.48, 0, 0.48]) {
      this.ctx.beginPath();
      this.ctx.arc(jewelX * size, size * 0.28, size * 0.1, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private isVisible(x: number, y: number, margin = 0): boolean {
    const viewWidth = this.viewportWidth() / this.camera.zoom;
    const viewHeight = this.viewportHeight() / this.camera.zoom;
    const screenX = x - this.camera.x;
    const screenY = y - this.camera.y;
    return screenX >= -margin
      && screenY >= -margin
      && screenX <= viewWidth + margin
      && screenY <= viewHeight + margin;
  }

  private viewportWidth(): number {
    return window.visualViewport?.width ?? window.innerWidth;
  }

  private viewportHeight(): number {
    return window.visualViewport?.height ?? window.innerHeight;
  }
}
