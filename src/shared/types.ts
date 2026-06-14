export type EntityId = string;

export type Vector = {
  x: number;
  y: number;
};

export type SkinId =
  | 'neon'
  | 'ember'
  | 'ocean'
  | 'candy'
  | 'mono'
  | 'toxic'
  | 'sunset'
  | 'galaxy'
  | 'ice'
  | 'lava'
  | 'brazil'
  | 'argentina'
  | 'usa'
  | 'france'
  | 'germany'
  | 'italy'
  | 'spain'
  | 'portugal'
  | 'japan'
  | 'mexico';
export type MinimapMode = 'full' | 'basic' | 'off';
export type GameMode = 'multiplayer' | 'ai';
export type BotDifficulty = 'dumb' | 'normal' | 'smart';
export type ControlMode = 'mouse' | 'keyboard';
export type FoodSource = 'ambient' | 'boost' | 'death';

export type Skin = {
  id: SkinId;
  name: string;
  category: 'color' | 'country';
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
  botDifficulty: BotDifficulty | null;
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

export type LeaderIndicator = {
  id: EntityId;
  position: Vector;
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
  leader: LeaderIndicator | null;
};

export type ClientMessage =
  | {
      type: 'join';
      name: string;
      skin: SkinId;
      gameMode: GameMode;
      minimapMode: MinimapMode;
      resetMatch?: boolean;
    }
  | {
      type: 'settings';
      minimapMode: MinimapMode;
    }
  | {
      type: 'dev';
      paused?: boolean;
      godMode?: boolean;
      infiniteBoost?: boolean;
      clearDeathMass?: boolean;
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
  { id: 'neon', name: 'Neon', category: 'color', head: '#45ffb5', body: ['#24e58f', '#12b6ff'], glow: '#45ffb5' },
  { id: 'ember', name: 'Brasa', category: 'color', head: '#ffce63', body: ['#ff5a3d', '#ff9d1c'], glow: '#ff7a24' },
  { id: 'ocean', name: 'Oceano', category: 'color', head: '#82d8ff', body: ['#2c78ff', '#23dbc7'], glow: '#22b7ff' },
  { id: 'candy', name: 'Doce', category: 'color', head: '#ffd4f5', body: ['#ff63ce', '#8f7cff'], glow: '#ff7bd8' },
  { id: 'mono', name: 'Mono', category: 'color', head: '#ffffff', body: ['#d7d7d7', '#7b7b7b'], glow: '#ffffff' },
  { id: 'toxic', name: 'Toxica', category: 'color', head: '#d7ff4d', body: ['#99ff25', '#34ff70'], glow: '#aaff33' },
  { id: 'sunset', name: 'Por do sol', category: 'color', head: '#ffd166', body: ['#ff4d6d', '#ff8c42', '#ffd166'], glow: '#ff6b6b' },
  { id: 'galaxy', name: 'Galaxia', category: 'color', head: '#d8b4ff', body: ['#5b2cff', '#b517ff', '#ff4fd8'], glow: '#b76bff' },
  { id: 'ice', name: 'Gelo', category: 'color', head: '#ffffff', body: ['#e8fbff', '#74dfff', '#2b9fff'], glow: '#8eeaff' },
  { id: 'lava', name: 'Lava', category: 'color', head: '#fff0a8', body: ['#3b0808', '#d7191c', '#ff7a00', '#ffd000'], glow: '#ff4d00' },
  { id: 'brazil', name: 'Brasil', category: 'country', head: '#ffdf00', body: ['#009c3b', '#ffdf00', '#002776', '#ffdf00'], glow: '#ffdf00' },
  { id: 'argentina', name: 'Argentina', category: 'country', head: '#ffffff', body: ['#74acdf', '#ffffff', '#f6b40e', '#ffffff'], glow: '#74acdf' },
  { id: 'usa', name: 'Estados Unidos', category: 'country', head: '#ffffff', body: ['#b31942', '#ffffff', '#0a3161', '#ffffff'], glow: '#ffffff' },
  { id: 'france', name: 'Franca', category: 'country', head: '#ffffff', body: ['#0055a4', '#ffffff', '#ef4135'], glow: '#ffffff' },
  { id: 'germany', name: 'Alemanha', category: 'country', head: '#ffce00', body: ['#111111', '#dd0000', '#ffce00'], glow: '#ffce00' },
  { id: 'italy', name: 'Italia', category: 'country', head: '#ffffff', body: ['#009246', '#ffffff', '#ce2b37'], glow: '#ffffff' },
  { id: 'spain', name: 'Espanha', category: 'country', head: '#ffc400', body: ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b'], glow: '#f1bf00' },
  { id: 'portugal', name: 'Portugal', category: 'country', head: '#ffcc00', body: ['#046a38', '#da291c', '#da291c'], glow: '#ffcc00' },
  { id: 'japan', name: 'Japao', category: 'country', head: '#bc002d', body: ['#ffffff', '#ffffff', '#bc002d'], glow: '#ffffff' },
  { id: 'mexico', name: 'Mexico', category: 'country', head: '#ffffff', body: ['#006847', '#ffffff', '#ce1126'], glow: '#ffffff' },
];

export const findSkin = (id: SkinId): Skin => SKINS.find((skin) => skin.id === id) ?? SKINS[0];
