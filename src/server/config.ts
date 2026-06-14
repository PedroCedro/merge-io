export const SERVER_PORT = Number(process.env.PORT ?? 8080);

export const TICK_RATE = 30;

export const WORLD = {
  width: 10400,
  height: 10400,
  initialFood: 15000,
  maxFood: 15000,
  replenishFood: false,
  deathFoodValue: 5,
};

export const BOTS = {
  roamDistance: 800,
  roster: [
    { name: 'Dumb-Dot', difficulty: 'dumb', quadrant: 0 },
    { name: 'Normal-Byte', difficulty: 'normal', quadrant: 0 },
    { name: 'Smart-Apex', difficulty: 'smart', quadrant: 0 },
    { name: 'Dumb-Zig', difficulty: 'dumb', quadrant: 1 },
    { name: 'Normal-Nova', difficulty: 'normal', quadrant: 1 },
    { name: 'Smart-Orbit', difficulty: 'smart', quadrant: 1 },
    { name: 'Dumb-Lost', difficulty: 'dumb', quadrant: 2 },
    { name: 'Normal-Dash', difficulty: 'normal', quadrant: 2 },
    { name: 'Smart-Viper', difficulty: 'smart', quadrant: 2 },
    { name: 'Dumb-Drift', difficulty: 'dumb', quadrant: 3 },
    { name: 'Normal-Echo', difficulty: 'normal', quadrant: 3 },
    { name: 'Smart-Nexus', difficulty: 'smart', quadrant: 3 },
  ] as const,
  difficulty: {
    dumb: {
      thinkIntervalTicks: 12,
      foodScanRadius: 240,
      dangerRadius: 150,
      wallMargin: 150,
      foodSampleStep: 6,
      dangerSegmentStep: 7,
      roamJitter: 1.15,
      escapeBoost: false,
      foodValueWeight: 0,
    },
    normal: {
      thinkIntervalTicks: 5,
      foodScanRadius: 360,
      dangerRadius: 260,
      wallMargin: 260,
      foodSampleStep: 3,
      dangerSegmentStep: 3,
      roamJitter: 0.55,
      escapeBoost: true,
      foodValueWeight: 18,
    },
    smart: {
      thinkIntervalTicks: 2,
      foodScanRadius: 560,
      dangerRadius: 390,
      wallMargin: 380,
      foodSampleStep: 1,
      dangerSegmentStep: 2,
      roamJitter: 0.22,
      escapeBoost: true,
      foodValueWeight: 52,
    },
  },
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
  mobileAreaOfInterest: 1250,
  mobileAreaOfInterestMax: 2100,
  mobileFoodLimitPerClient: 220,
  mobileFoodLimitPerClientMax: 650,
  mobileFoodLimitPerSegment: 1,
  mobileSnapshotTickStep: 2,
  leaderboardSize: 10,
  minimapSegmentStep: 5,
};
