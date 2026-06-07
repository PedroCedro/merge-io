export type EntityId = string;

export type Vector = {
  x: number;
  y: number;
};

export type SkinId = 'neon' | 'ember' | 'ocean' | 'candy' | 'mono' | 'toxic';
export type MinimapMode = 'full' | 'basic' | 'off';
export type GameMode = 'multiplayer' | 'ai';
export type ControlMode = 'mouse' | 'keyboard';
export type FoodSource = 'ambient' | 'boost' | 'death';

export type Skin = {
  id: SkinId;
  name: string;
  head: string;
  body: string[];
  glow: string;
};

export type Food = Vector & {
  id: EntityId;
  value: number;
  radius: number;
  color: string;
  source: FoodSource;
  spawnTick: number;
};

export type SnakeSnapshot = {
  id: EntityId;
  name: string;
  skin: SkinId;
  bot: boolean;
  alive: boolean;
  score: number;
  radius: number;
  angle: number;
  boosting: boolean;
  segments: Vector[];
};

export type MinimapSnakeSnapshot = {
  id: EntityId;
  skin: SkinId;
  radius: number;
  segments: Vector[];
};

export type LeaderboardEntry = {
  id: EntityId;
  name: string;
  score: number;
  length: number;
  skin: SkinId;
};

export type WorldSnapshot = {
  selfId: EntityId | null;
  tick: number;
  world: {
    width: number;
    height: number;
  };
  snakes: SnakeSnapshot[];
  radarSnakes: MinimapSnakeSnapshot[];
  foods: Food[];
  leaderboard: LeaderboardEntry[];
};

export type ClientMessage =
  | {
      type: 'join';
      name: string;
      skin: SkinId;
      gameMode: GameMode;
      minimapMode: MinimapMode;
    }
  | {
      type: 'settings';
      minimapMode: MinimapMode;
    }
  | {
      type: 'dev';
      paused?: boolean;
      godMode?: boolean;
    }
  | {
      type: 'input';
      target: Vector;
      boosting: boolean;
    };

export type ServerMessage =
  | {
      type: 'welcome';
      id: EntityId;
      snapshot: WorldSnapshot;
    }
  | {
      type: 'state';
      snapshot: WorldSnapshot;
    }
  | {
      type: 'dead';
      score: number;
      reason: string;
    };

export const SKINS: Skin[] = [
  { id: 'neon', name: 'Neon', head: '#45ffb5', body: ['#24e58f', '#12b6ff'], glow: '#45ffb5' },
  { id: 'ember', name: 'Ember', head: '#ffce63', body: ['#ff5a3d', '#ff9d1c'], glow: '#ff7a24' },
  { id: 'ocean', name: 'Ocean', head: '#82d8ff', body: ['#2c78ff', '#23dbc7'], glow: '#22b7ff' },
  { id: 'candy', name: 'Candy', head: '#ffd4f5', body: ['#ff63ce', '#8f7cff'], glow: '#ff7bd8' },
  { id: 'mono', name: 'Mono', head: '#ffffff', body: ['#d7d7d7', '#7b7b7b'], glow: '#ffffff' },
  { id: 'toxic', name: 'Toxic', head: '#d7ff4d', body: ['#99ff25', '#34ff70'], glow: '#aaff33' },
];

export const findSkin = (id: SkinId): Skin => SKINS.find((skin) => skin.id === id) ?? SKINS[0];
