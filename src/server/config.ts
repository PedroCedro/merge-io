export const SERVER_PORT = Number(process.env.PORT ?? 8080);

export const TICK_RATE = 30;

export const WORLD = {
  width: 5200,
  height: 5200,
  initialFood: 15000,
  maxFood: 15000,
  replenishFood: false,
  deathFoodValue: 5,
};

export const BOTS = {
  targetCount: 10,
  names: ['Byte', 'Nova', 'Orbit', 'Flux', 'Pixel', 'Comet', 'Dash', 'Viper', 'Echo', 'Zero'],
  foodScanRadius: 360,
  dangerRadius: 260,
  wallMargin: 260,
  roamDistance: 800,
};

export const SNAKE = {
  initialLength: 3,
  massPerSegment: 4,
  visualMassGrowthPerSecond: 12,
  visualMassShrinkPerSecond: 24,
  boostMassCost: 1,
  segmentGap: 12,
  baseRadius: 7,
  radiusGrowth: 0.6,
  maxRadius: 32,
  baseSpeed: 150,
  maxBaseSpeed: 205,
  speedMassScale: 0.85,
  boostSpeedMultiplier: 1.63,
  turnLerp: 0.11,
  foodPickupRadius: 4,
  maxFoodPickupsPerTick: 1,
  maxDeathFoodPickupsPerTick: 3,
  collisionPadding: 5,
};

export const NETWORK = {
  areaOfInterest: 1800,
  areaOfInterestMax: 3600,
  foodLimitPerClient: 520,
  foodLimitPerClientMax: 1800,
  foodLimitPerSegment: 3,
  leaderboardSize: 10,
  minimapSegmentStep: 5,
};
