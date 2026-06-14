import type { InputController } from './input';

type MobileControlElements = {
  joystick: HTMLElement;
  joystickKnob: HTMLElement;
  boostButton: HTMLButtonElement;
};

export class MobileControls {
  private joystickPointerId: number | null = null;

  constructor(
    private readonly elements: MobileControlElements,
    private readonly input: InputController,
  ) {
    this.bindEvents();
  }

  private bindEvents(): void {
    const { joystick, boostButton } = this.elements;

    joystick.addEventListener('pointerdown', (event) => {
      this.joystickPointerId = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      this.updateJoystick(event.clientX, event.clientY);
      event.preventDefault();
    });
    joystick.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.joystickPointerId) {
        this.updateJoystick(event.clientX, event.clientY);
      }
    });
    joystick.addEventListener('pointerup', () => this.releaseJoystick());
    joystick.addEventListener('pointercancel', () => this.releaseJoystick());

    boostButton.addEventListener('pointerdown', (event) => {
      this.input.setBoosting(true);
      boostButton.classList.add('active');
      boostButton.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    boostButton.addEventListener('pointerup', () => this.stopBoost());
    boostButton.addEventListener('pointercancel', () => this.stopBoost());
  }

  private updateJoystick(clientX: number, clientY: number): void {
    const { joystick, joystickKnob } = this.elements;
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = rect.width * 0.3;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const scale = distance > maxDistance ? maxDistance / distance : 1;

    joystickKnob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    this.input.setVirtualDirection(
      distance > 4 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 },
    );
  }

  private releaseJoystick(): void {
    this.joystickPointerId = null;
    this.elements.joystickKnob.style.transform = 'translate(0, 0)';
    this.input.setVirtualDirection({ x: 0, y: 0 });
  }

  private stopBoost(): void {
    this.input.setBoosting(false);
    this.elements.boostButton.classList.remove('active');
  }
}

