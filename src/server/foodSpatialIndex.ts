import type { Food, Vector } from '../shared/types';
import { distanceSquared } from './math';

export class FoodSpatialIndex {
  private readonly cells = new Map<string, Set<Food>>();

  constructor(private readonly cellSize: number) {}

  add(food: Food): void {
    const key = this.keyFor(food);
    const cell = this.cells.get(key);
    if (cell) {
      cell.add(food);
      return;
    }

    this.cells.set(key, new Set([food]));
  }

  remove(food: Food): void {
    const key = this.keyFor(food);
    const cell = this.cells.get(key);
    if (!cell) {
      return;
    }

    cell.delete(food);
    if (cell.size === 0) {
      this.cells.delete(key);
    }
  }

  clear(): void {
    this.cells.clear();
  }

  queryCircle(center: Vector, radius: number): Food[] {
    const foods: Food[] = [];
    const radiusSquared = radius * radius;
    const minCellX = Math.floor((center.x - radius) / this.cellSize);
    const maxCellX = Math.floor((center.x + radius) / this.cellSize);
    const minCellY = Math.floor((center.y - radius) / this.cellSize);
    const maxCellY = Math.floor((center.y + radius) / this.cellSize);

    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const cell = this.cells.get(this.key(cellX, cellY));
        if (!cell) {
          continue;
        }

        for (const food of cell) {
          if (distanceSquared(center, food) <= radiusSquared) {
            foods.push(food);
          }
        }
      }
    }

    return foods;
  }

  private keyFor(position: Vector): string {
    return this.key(
      Math.floor(position.x / this.cellSize),
      Math.floor(position.y / this.cellSize),
    );
  }

  private key(cellX: number, cellY: number): string {
    return `${cellX}:${cellY}`;
  }
}
