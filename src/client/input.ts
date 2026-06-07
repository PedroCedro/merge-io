import type { Vector } from '../shared/types';

export class InputController {
  target: Vector = { x: 0, y: 0 };
  keyboardDirection: Vector = { x: 0, y: 0 };
  boosting = false;
  private readonly pressed = new Set<string>();

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('mousemove', (event) => {
      this.target = { x: event.clientX, y: event.clientY };
    });

    window.addEventListener(
      'touchmove',
      (event) => {
        const touch = event.touches[0];
        if (touch) {
          this.target = { x: touch.clientX, y: touch.clientY };
        }
      },
      { passive: true },
    );

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        this.boosting = true;
        event.preventDefault();
        return;
      }

      if (this.isDirectionKey(event.code)) {
        this.pressed.add(event.code);
        this.updateKeyboardDirection();
        event.preventDefault();
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.code === 'Space') {
        this.boosting = false;
        return;
      }

      if (this.isDirectionKey(event.code)) {
        this.pressed.delete(event.code);
        this.updateKeyboardDirection();
      }
    });

    this.target = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
    };
  }

  private isDirectionKey(code: string): boolean {
    return ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(code);
  }

  private updateKeyboardDirection(): void {
    const x = (this.pressed.has('KeyD') || this.pressed.has('ArrowRight') ? 1 : 0) - (this.pressed.has('KeyA') || this.pressed.has('ArrowLeft') ? 1 : 0);
    const y = (this.pressed.has('KeyS') || this.pressed.has('ArrowDown') ? 1 : 0) - (this.pressed.has('KeyW') || this.pressed.has('ArrowUp') ? 1 : 0);
    const length = Math.hypot(x, y);
    this.keyboardDirection = length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
  }
}
