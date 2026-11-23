import {
  CosmeticItem,
  DailyChallenge,
  GravityPreset,
  PlayerProfile,
  SkillId,
  SpecialSkillConfig,
  WeaponId,
  ZoneConfig,
  ZoneId,
} from './types';

export const CHARACTER_REFERENCE_IMAGE =
  '/assets/aistudio/Gemini_Generated_Image_w6rd0kw6rd0kw6rd_83cc7586.jpg';

export const GRAVITY_PRESETS: Record<
  GravityPreset,
  { label: string; factor: number; shortLabel: string; color: string }
> = {
  zero: { label: 'Zero-G Float', factor: 0.14, shortLabel: '0.1G', color: '#38BDF8' },
  low: { label: 'Low-G Leap', factor: 0.42, shortLabel: '0.4G', color: '#34D399' },
  normal: { label: 'Standard 1G', factor: 1.0, shortLabel: '1.0G', color: '#F472B6' },
  heavy: { label: 'Heavy 2G', factor: 1.85, shortLabel: '1.9G', color: '#F59E0B' },
  inverted: { label: 'Inverted -1G', factor: -1.0, shortLabel: '-1.0G', color: '#A855F7' },
};

export const GRAVITY_ORDER: GravityPreset[] = ['zero', 'low', 'normal', 'heavy', 'inverted'];

export const ZONES: Record<ZoneId, ZoneConfig> = {
  1: {
    id: 1,
    key: 'sea',
    name: 'Abyssal Coral Trench',
    subtitle: 'Zone 1 · Under the Sea',
    biomeLabel: 'Bioluminescent Reef & Currents',
    skyTop: '#041C32',
    skyBottom: '#064663',
    accentColor: '#22D3EE',
    platformColor: '#0E4D64',
    platformTrim: '#38BDF8',
    enemyTypes: ['puffer', 'jelly', 'crab'],
    bossName: 'Leviathan Kraken-Titan',
    bossTitle: 'Colossal Deep-Sea Siege Mech',
    bossHpBase: 900,
    rewardSkill: 'tidal_shield',
    levelLength: 3600,
    defaultGravityHint: 'Ride rising bubble currents with Low-G or invert to the reef ceiling.',
  },
  2: {
    id: 2,
    key: 'sky',
    name: 'Nimbus Sky Citadel',
    subtitle: 'Zone 2 · Up in the Skies',
    biomeLabel: 'Soaring Wind Streams & Cloud Isles',
    skyTop: '#1E3A8A',
    skyBottom: '#38BDF8',
    accentColor: '#FBBF24',
    platformColor: '#E2E8F0',
    platformTrim: '#F59E0B',
    enemyTypes: ['corsair', 'harpy', 'aeroturret'],
    bossName: 'Aurelia Sky-Galleon',
    bossTitle: 'Colossal Winged Cloud Dreadnought',
    bossHpBase: 1250,
    rewardSkill: 'aether_wings',
    levelLength: 4000,
    defaultGravityHint: 'Catch golden updraft jets in Zero-G to soar across sky islands.',
  },
  3: {
    id: 3,
    key: 'cave',
    name: 'Crystal Echo Caverns',
    subtitle: 'Zone 3 · Inside Deep Caves',
    biomeLabel: 'Amethyst Geodes & Magma Veins',
    skyTop: '#1A0B2E',
    skyBottom: '#3B0764',
    accentColor: '#E879F9',
    platformColor: '#312E81',
    platformTrim: '#C084FC',
    enemyTypes: ['bat', 'golem', 'magmaslime'],
    bossName: 'Obsidian Wyrm Colossus',
    bossTitle: 'Giant Crystal-Armored Cavern Dragon',
    bossHpBase: 1650,
    rewardSkill: 'crystal_quake',
    levelLength: 4300,
    defaultGravityHint: 'Invert gravity to evade magma fissures and drop Heavy-G slams on golems.',
  },
  4: {
    id: 4,
    key: 'space',
    name: 'Orbital Nebula Rift',
    subtitle: 'Zone 4 · Outer Space',
    biomeLabel: 'Asteroid Fields & Gravity Wells',
    skyTop: '#030712',
    skyBottom: '#1E1B4B',
    accentColor: '#F472B6',
    platformColor: '#1E293B',
    platformTrim: '#EC4899',
    enemyTypes: ['saucer', 'prism', 'meteor'],
    bossName: 'Singularity Star-Titan',
    bossTitle: 'Colossal Orbital Planetoid Sentinel',
    bossHpBase: 2100,
    rewardSkill: 'chrono_dilation',
    levelLength: 4600,
    defaultGravityHint: 'Chain mid-air shifts near cosmic wells for x5 Shift Combo gem multipliers.',
  },
  5: {
    id: 5,
    key: 'galactic',
    name: 'Galactic Core Sanctuary',
    subtitle: 'Zone 5 · Deep Galaxy',
    biomeLabel: 'Prismatic Flux Megastructure',
    skyTop: '#090518',
    skyBottom: '#311042',
    accentColor: '#34D399',
    platformColor: '#0F172A',
    platformTrim: '#10B981',
    enemyTypes: ['chronoknight', 'astralturret', 'stalker'],
    bossName: 'Omega Astral Sovereign',
    bossTitle: 'Colossal Gravity-Shifting Galactic Overlord',
    bossHpBase: 2700,
    rewardSkill: 'astral_supernova',
    levelLength: 5000,
    defaultGravityHint: 'Master rapid shifts and 3-hit finishers against the Astral Sovereign.',
  },
};

export const WEAPONS: Record<
  WeaponId,
  {
    id: WeaponId;
    name: string;
    subtitle: string;
    comboNames: [string, string, string];
    description: string;
    color: string;
  }
> = {
  sword: {
    id: 'sword',
    name: 'Starlight Blade',
    subtitle: 'Magical Melee Sword',
    comboNames: ['Crescent Slash', 'Rising Void Cleave', 'Gravity Meteor Slam'],
    description: 'Wide melee arcs that deflect enemy projectiles. Step 3 unleashes a shockwave.',
    color: '#EC4899',
  },
  gun: {
    id: 'gun',
    name: 'Prism Blaster',
    subtitle: 'Aether Pulse Sidearm',
    comboNames: ['Aether Bolt', 'Twin Scatter Pulse', 'Hyper-Rail Beam'],
    description: 'Long-range rapid fire with mid-air recoil hop. Step 3 fires a piercing rail beam.',
    color: '#38BDF8',
  },
  staff: {
    id: 'staff',
    name: 'Orbital Nova Staff',
    subtitle: 'Graviton Orb Caster',
    comboNames: ['Arc Spark', 'Orbiting Ring', 'Supernova Detonation'],
    description: 'Launches returning gravity orbs that pull enemies and detonate on Step 3.',
    color: '#A855F7',
  },
};

export const SPECIAL_SKILLS: Record<SkillId, SpecialSkillConfig> = {
  tidal_shield: {
    id: 'tidal_shield',
    name: 'Tidal Bubble Shield',
    unlockZone: 1,
    cooldownSec: 12,
    description: 'Grants a 4s water-aether shield that blocks hits and blasts nearby foes away.',
    color: '#22D3EE',
  },
  aether_wings: {
    id: 'aether_wings',
    name: 'Skyward Aether Wings',
    unlockZone: 2,
    cooldownSec: 10,
    description: 'Activates 4s free-flight thrust and fires twin golden wind blades.',
    color: '#FBBF24',
  },
  crystal_quake: {
    id: 'crystal_quake',
    name: 'Crystal Shockwave',
    unlockZone: 3,
    cooldownSec: 11,
    description: 'Triggers an instant gravity pulse shattering nearby bullets and dealing heavy AoE.',
    color: '#E879F9',
  },
  chrono_dilation: {
    id: 'chrono_dilation',
    name: 'Zero-G Time Dilation',
    unlockZone: 4,
    cooldownSec: 15,
    description: 'Slows all enemies and projectiles by 60% for 5s while boosting attack speed.',
    color: '#38BDF8',
  },
  astral_supernova: {
    id: 'astral_supernova',
    name: 'Supernova Astral Burst',
    unlockZone: 5,
    cooldownSec: 16,
    description: 'Unleashes 8 homing starlight beams across the arena for massive boss damage.',
    color: '#34D399',
  },
};

export const COSMETICS: CosmeticItem[] = [
  // Outfits
  {
    id: 'original_ruffle',
    slot: 'outfit',
    name: 'Pink Ruffle & Denim',
    description: 'Signature eyelet pink top, stitched denim jeans, and pink-blue sneakers.',
    cost: 0,
    primaryColor: '#EC4899',
    secondaryColor: '#2563EB',
    accentColor: '#F472B6',
  },
  {
    id: 'abyss_diver',
    slot: 'outfit',
    name: 'Abyssal Tide Suit',
    description: 'Bioluminescent deep-sea suit forged in the Coral Trench.',
    cost: 60,
    primaryColor: '#06B6D4',
    secondaryColor: '#0F172A',
    accentColor: '#67E8F9',
  },
  {
    id: 'sky_aviator',
    slot: 'outfit',
    name: 'Nimbus Flight Jacket',
    description: 'Golden-trimmed sky captain jacket with cloud-weave leggings.',
    cost: 90,
    primaryColor: '#F59E0B',
    secondaryColor: '#1E3A8A',
    accentColor: '#FEF08A',
  },
  {
    id: 'crystal_knight',
    slot: 'outfit',
    name: 'Amethyst Geode Coat',
    description: 'Crystalline cavern tunic shimmering with violet rune trim.',
    cost: 120,
    primaryColor: '#A855F7',
    secondaryColor: '#312E81',
    accentColor: '#F0ABFC',
  },
  {
    id: 'nebula_suit',
    slot: 'outfit',
    name: 'Galactic Sovereign Armor',
    description: 'Prismatic starlight suit crafted for deep-space gravity masters.',
    cost: 180,
    primaryColor: '#10B981',
    secondaryColor: '#090D1F',
    accentColor: '#38BDF8',
  },

  // Glasses
  {
    id: 'pink_blue_round',
    slot: 'glasses',
    name: 'Signature Duo Frames',
    description: 'Iconic round periwinkle-blue & pink double-rimmed glasses.',
    cost: 0,
    primaryColor: '#60A5FA',
    secondaryColor: '#F472B6',
    accentColor: '#FFFFFF',
  },
  {
    id: 'visor_cyan',
    slot: 'glasses',
    name: 'Orbital Holo-Visor',
    description: 'Sleek translucent cyan HUD visor for aerial combat.',
    cost: 50,
    primaryColor: '#22D3EE',
    secondaryColor: '#0E7490',
    accentColor: '#CFFAFE',
  },
  {
    id: 'star_shades',
    slot: 'glasses',
    name: 'Supernova Star Frames',
    description: 'Golden star-cut frames radiating cosmic flair.',
    cost: 85,
    primaryColor: '#FBBF24',
    secondaryColor: '#B45309',
    accentColor: '#FEF08A',
  },
  {
    id: 'cat_eye_prism',
    slot: 'glasses',
    name: 'Nebula Cat-Eye',
    description: 'Sharp magenta-violet frames built for high-G stunts.',
    cost: 110,
    primaryColor: '#EC4899',
    secondaryColor: '#7E22CE',
    accentColor: '#F9A8D4',
  },

  // Hairstyles
  {
    id: 'high_ponytail',
    slot: 'hair',
    name: 'Classic High Ponytail',
    description: 'Signature espresso-brown high ponytail with curved bangs.',
    cost: 0,
    primaryColor: '#4A2C20',
    secondaryColor: '#2C1810',
    accentColor: '#EC4899',
  },
  {
    id: 'cosmic_twintails',
    slot: 'hair',
    name: 'Starlight Twin-Tails',
    description: 'Dual floating twin-tails tipped with cosmic rose highlights.',
    cost: 75,
    primaryColor: '#3B2338',
    secondaryColor: '#EC4899',
    accentColor: '#38BDF8',
  },
  {
    id: 'crowned_bob',
    slot: 'hair',
    name: 'Nimbus Tiara Bob',
    description: 'Sleek chestnut bob adorned with a miniature gravity crown.',
    cost: 100,
    primaryColor: '#5C3A21',
    secondaryColor: '#FBBF24',
    accentColor: '#FDE68A',
  },
  {
    id: 'nebula_braid',
    slot: 'hair',
    name: 'Astral Prism Braid',
    description: 'Long indigo-violet braid that trails smoothly in zero gravity.',
    cost: 140,
    primaryColor: '#312E81',
    secondaryColor: '#818CF8',
    accentColor: '#34D399',
  },

  // Auras / Trails
  {
    id: 'pedestal_spark',
    slot: 'aura',
    name: 'Collector Disc Glow',
    description: 'Clean silver-pink hover disc ring beneath your sneakers.',
    cost: 0,
    primaryColor: '#E2E8F0',
    secondaryColor: '#EC4899',
    accentColor: '#60A5FA',
  },
  {
    id: 'bubble_stream',
    slot: 'aura',
    name: 'Coral Bubble Stream',
    description: 'Leaves shimmering oceanic bubbles on every mid-air shift.',
    cost: 55,
    primaryColor: '#22D3EE',
    secondaryColor: '#38BDF8',
    accentColor: '#E0F2FE',
  },
  {
    id: 'cloud_wings',
    slot: 'aura',
    name: 'Nimbus Feather Trail',
    description: 'Luminous golden-white wing feathers burst during jumps.',
    cost: 95,
    primaryColor: '#FBBF24',
    secondaryColor: '#F8FAFC',
    accentColor: '#F59E0B',
  },
  {
    id: 'starlight_ribbon',
    slot: 'aura',
    name: 'Galactic Prism Ribbon',
    description: 'Multi-hued cosmic ribbon trailing behind every aerial flip.',
    cost: 150,
    primaryColor: '#34D399',
    secondaryColor: '#A855F7',
    accentColor: '#F472B6',
  },
];

export const DAILY_LOGIN_REWARDS = [
  { day: 1, shards: 35, coins: 100, label: 'Day 1' },
  { day: 2, shards: 45, coins: 150, label: 'Day 2' },
  { day: 3, shards: 60, coins: 200, label: 'Day 3' },
  { day: 4, shards: 75, coins: 280, label: 'Day 4' },
  { day: 5, shards: 95, coins: 350, label: 'Day 5' },
  { day: 6, shards: 120, coins: 450, label: 'Day 6' },
  { day: 7, shards: 180, coins: 700, label: 'Day 7 Bonus' },
];

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyChallengesForDate(dateKey: string): DailyChallenge[] {
  // Deterministic seed based on dateKey so challenges rotate daily
  const seed = dateKey.split('').reduce((acc, ch) => acc + ch.charCodeAt(0) * 17, 0);
  const pool: Omit<DailyChallenge, 'dateKey'>[] = [
    {
      id: `${dateKey}_inverted`,
      title: 'Ceiling Acrobat',
      description: 'Collect 12 Star Shards while inverted (-1G) in a single run.',
      metric: 'inverted_gems',
      target: 12,
      rewardShards: 45,
    },
    {
      id: `${dateKey}_combos`,
      title: 'Triple-Hit Virtuoso',
      description: 'Land 8 third-hit Weapon Combo Finishers in a single run.',
      metric: 'combo_finishers',
      target: 8,
      rewardShards: 50,
    },
    {
      id: `${dateKey}_shifts`,
      title: 'Mid-Air Flux Dancer',
      description: 'Execute 22 seamless mid-air gravity shifts in one run.',
      metric: 'midair_shifts',
      target: 22,
      rewardShards: 40,
    },
    {
      id: `${dateKey}_shiftscore`,
      title: 'Aether Multiplier Ace',
      description: 'Earn 2,500 bonus points from mid-air Shift-Combo gem pickups.',
      metric: 'shift_score',
      target: 2500,
      rewardShards: 55,
    },
    {
      id: `${dateKey}_boss`,
      title: 'Iron Will Boss Slayer',
      description: 'Defeat any colossal Zone Boss with Infinite Life turned OFF.',
      metric: 'boss_hardcore',
      target: 1,
      rewardShards: 75,
    },
  ];
  // Always pick 4 deterministic challenges including Iron Will Boss Slayer
  const picked: DailyChallenge[] = [];
  const start = seed % 2;
  for (let i = 0; i < 3; i++) {
    const item = pool[(start + i) % 4];
    picked.push({ ...item, dateKey });
  }
  picked.push({ ...pool[4], dateKey });
  return picked;
}

export function createDefaultProfile(uid = 'offline-local', displayName = 'Sky Runner'): PlayerProfile {
  return {
    uid,
    displayName,
    challengeCurrency: 30,
    starCoins: 0,
    unlockedZone: 1,
    unlockedSkills: [],
    unlockedCosmetics: ['original_ruffle', 'pink_blue_round', 'high_ponytail', 'pedestal_spark'],
    equippedWeapon: 'sword',
    equippedOutfit: 'original_ruffle',
    equippedGlasses: 'pink_blue_round',
    equippedHair: 'high_ponytail',
    equippedAura: 'pedestal_spark',
    vitalityLevel: 1,
    powerLevel: 1,
    gravMasteryLevel: 1,
    dailyStreak: 0,
    lastDailyClaimDate: '',
    completedDailyChallenges: [],
    highScore: 0,
    infiniteLife: false,
  };
}
