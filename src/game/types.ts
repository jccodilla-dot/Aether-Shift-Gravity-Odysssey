export type GameScreenState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'STAGE_CLEAR' | 'GAME_OVER' | 'EXITED';

export type WeaponId =
  | 'sword'
  | 'gun'
  | 'staff'
  | 'super_spread_fireball'
  | 'super_ultra_laser'
  | 'super_laser_sword'
  | 'super_round_fireball'
  | 'super_machine_gun';

export type GravityPreset = 'zero' | 'low' | 'normal' | 'heavy' | 'inverted';

export type ZoneId = number;

export type ZoneBiomeKey =
  | 'sea'
  | 'sky'
  | 'cave'
  | 'space'
  | 'galactic'
  | 'solar'
  | 'cyber'
  | 'forest'
  | 'glacial'
  | 'forge';

export type SkillId =
  | 'tidal_shield'
  | 'aether_wings'
  | 'crystal_quake'
  | 'chrono_dilation'
  | 'astral_supernova';

export type CosmeticSlot = 'outfit' | 'glasses' | 'hair' | 'aura';

export interface CosmeticItem {
  id: string;
  slot: CosmeticSlot;
  name: string;
  description: string;
  cost: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface ZoneConfig {
  id: ZoneId;
  key: ZoneBiomeKey;
  tier: number;
  speedScale: number;
  enemyHpScale: number;
  bossModelIndex: number;
  mutatorTitle: string;
  mutatorDesc: string;
  name: string;
  subtitle: string;
  biomeLabel: string;
  skyTop: string;
  skyBottom: string;
  accentColor: string;
  platformColor: string;
  platformTrim: string;
  enemyTypes: EnemyKind[];
  bossName: string;
  bossTitle: string;
  bossHpBase: number;
  rewardSkill: SkillId;
  levelLength: number;
  defaultGravityHint: string;
}

export type EnemyKind =
  | 'puffer'
  | 'jelly'
  | 'crab'
  | 'corsair'
  | 'harpy'
  | 'aeroturret'
  | 'bat'
  | 'golem'
  | 'magmaslime'
  | 'saucer'
  | 'prism'
  | 'meteor'
  | 'chronoknight'
  | 'astralturret'
  | 'stalker';

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  subtitle: string;
  comboNames: [string, string, string];
  description: string;
  color: string;
  isSuper: boolean;
  unlockZone: number;
}

export interface SpecialSkillConfig {
  id: SkillId;
  name: string;
  unlockZone: ZoneId;
  cooldownSec: number;
  description: string;
  color: string;
}

export interface DailyChallenge {
  id: string;
  dateKey: string;
  title: string;
  description: string;
  metric: 'inverted_gems' | 'combo_finishers' | 'boss_hardcore' | 'midair_shifts' | 'shift_score';
  target: number;
  rewardShards: number;
}

export interface PlayerProfile {
  uid: string;
  displayName: string;
  challengeCurrency: number;
  starCoins: number;
  lifeCredits: number;
  unlockedZone: number;
  unlockedSkills: SkillId[];
  unlockedCosmetics: string[];
  equippedWeapon: WeaponId;
  equippedOutfit: string;
  equippedGlasses: string;
  equippedHair: string;
  equippedAura: string;
  vitalityLevel: number;
  powerLevel: number;
  gravMasteryLevel: number;
  dailyStreak: number;
  lastDailyClaimDate: string;
  completedDailyChallenges: string[];
  highScore: number;
  infiniteLife: boolean;
  customPhotoDataUrl: string | null;
  usePhotoCharacter: boolean;
}

export interface LeaderboardEntry {
  uid: string;
  playerName: string;
  score: number;
  zoneReached: number;
  weapon: WeaponId;
  outfitId: string;
  difficultyPeak: number;
  isPublic: boolean;
  updatedAt?: string;
}

export interface HudSnapshot {
  score: number;
  hp: number;
  maxHp: number;
  lives: number;
  infiniteLife: boolean;
  gravityPreset: GravityPreset;
  gravityMultiplier: number;
  shiftCombo: number;
  shiftTimer: number;
  weapon: WeaponId;
  comboStep: number;
  comboTimer: number;
  equippedSkill: SkillId | null;
  skillCooldown: number;
  skillMaxCooldown: number;
  hiddenPowerTimer: number;
  hiddenPowerMax: number;
  difficultyMultiplier: number;
  zoneId: ZoneId;
  zoneTier: number;
  zoneMutator: string;
  progressPct: number;
  bossActive: boolean;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: number;
  runCoins: number;
  runInvertedGems: number;
  runComboFinishers: number;
  runMidAirShifts: number;
  runShiftScore: number;
  lifeCreditsEarned: number;
}

export interface ChallengeTarget {
  playerName: string;
  targetScore: number;
  zoneId: ZoneId;
  weapon: WeaponId;
}
