export type GameScreenState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'STAGE_CLEAR' | 'GAME_OVER';

export type WeaponId = 'sword' | 'gun' | 'staff';

export type GravityPreset = 'zero' | 'low' | 'normal' | 'heavy' | 'inverted';

export type ZoneId = 1 | 2 | 3 | 4 | 5;

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
  cost: number; // Prism Shards (earned via daily challenges & daily rewards)
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface ZoneConfig {
  id: ZoneId;
  key: 'sea' | 'sky' | 'cave' | 'space' | 'galactic';
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
  challengeCurrency: number; // Prism Shards (only from Daily Challenges & Daily Login Rewards)
  starCoins: number; // Starlight Coins (from combat & gems, for skill upgrades)
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
  difficultyMultiplier: number;
  zoneId: ZoneId;
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
}

export interface ChallengeTarget {
  playerName: string;
  targetScore: number;
  zoneId: ZoneId;
  weapon: WeaponId;
}
