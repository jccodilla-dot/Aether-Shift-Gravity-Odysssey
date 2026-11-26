import {
  CosmeticItem,
  DailyChallenge,
  EnemyKind,
  GravityPreset,
  PlayerProfile,
  SkillId,
  SpecialSkillConfig,
  WeaponConfig,
  WeaponId,
  ZoneBiomeKey,
  ZoneConfig,
  ZoneId,
} from './types';

export const MAX_ZONE = 100;

export const CHARACTER_REFERENCE_IMAGE =
  '/assets/aistudio/Sparkling_Princess_in_a_Rose_Garden_4f9bfa50.png';

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

interface BiomeTemplate {
  key: ZoneBiomeKey;
  titleBase: string;
  realmLabel: string;
  biomeLabel: string;
  skyTop: string;
  skyBottom: string;
  accentColor: string;
  platformColor: string;
  platformTrim: string;
  enemyTypes: EnemyKind[];
  bossNames: string[];
  bossTitle: string;
  bossModelIndex: number;
  rewardSkill: SkillId;
  defaultGravityHint: string;
}

const BIOME_TEMPLATES: BiomeTemplate[] = [
  {
    key: 'sea',
    titleBase: 'Abyssal Coral Trench',
    realmLabel: 'Under the Sea',
    biomeLabel: 'Bioluminescent Reef & Currents',
    skyTop: '#041C32',
    skyBottom: '#064663',
    accentColor: '#22D3EE',
    platformColor: '#0E4D64',
    platformTrim: '#38BDF8',
    enemyTypes: ['puffer', 'jelly', 'crab'],
    bossNames: ['Leviathan Kraken-Titan', 'Abyssal Nautilus Rex', 'Tidal Hydra Sovereign'],
    bossTitle: 'Colossal Deep-Sea Siege Titan',
    bossModelIndex: 1,
    rewardSkill: 'tidal_shield',
    defaultGravityHint: 'Ride rising bubble currents with Low-G or invert to the reef ceiling.',
  },
  {
    key: 'sky',
    titleBase: 'Nimbus Sky Citadel',
    realmLabel: 'Up in the Skies',
    biomeLabel: 'Soaring Wind Streams & Cloud Isles',
    skyTop: '#1E3A8A',
    skyBottom: '#38BDF8',
    accentColor: '#FBBF24',
    platformColor: '#E2E8F0',
    platformTrim: '#F59E0B',
    enemyTypes: ['corsair', 'harpy', 'aeroturret'],
    bossNames: ['Aurelia Sky-Galleon', 'Zephyr Valkyrie Dreadnought', 'Tempest Seraph Carrier'],
    bossTitle: 'Colossal Winged Cloud Dreadnought',
    bossModelIndex: 2,
    rewardSkill: 'aether_wings',
    defaultGravityHint: 'Catch golden updraft jets in Zero-G to soar across sky islands.',
  },
  {
    key: 'cave',
    titleBase: 'Crystal Echo Caverns',
    realmLabel: 'Inside Deep Caves',
    biomeLabel: 'Amethyst Geodes & Magma Veins',
    skyTop: '#1A0B2E',
    skyBottom: '#3B0764',
    accentColor: '#E879F9',
    platformColor: '#312E81',
    platformTrim: '#C084FC',
    enemyTypes: ['bat', 'golem', 'magmaslime'],
    bossNames: ['Obsidian Wyrm Colossus', 'Amethyst Behemoth', 'Magma-Core Gargantua'],
    bossTitle: 'Giant Crystal-Armored Cavern Dragon',
    bossModelIndex: 3,
    rewardSkill: 'crystal_quake',
    defaultGravityHint: 'Invert gravity to evade magma fissures and drop Heavy-G slams on golems.',
  },
  {
    key: 'space',
    titleBase: 'Orbital Nebula Rift',
    realmLabel: 'Outer Space',
    biomeLabel: 'Asteroid Fields & Gravity Wells',
    skyTop: '#030712',
    skyBottom: '#1E1B4B',
    accentColor: '#F472B6',
    platformColor: '#1E293B',
    platformTrim: '#EC4899',
    enemyTypes: ['saucer', 'prism', 'meteor'],
    bossNames: ['Singularity Star-Titan', 'Hypernova Dread-Orb', 'Eclipse Comet Sentinel'],
    bossTitle: 'Colossal Orbital Planetoid Sentinel',
    bossModelIndex: 4,
    rewardSkill: 'chrono_dilation',
    defaultGravityHint: 'Chain mid-air shifts near cosmic wells for x5 Shift Combo gem multipliers.',
  },
  {
    key: 'galactic',
    titleBase: 'Galactic Core Sanctuary',
    realmLabel: 'Deep Galaxy',
    biomeLabel: 'Prismatic Flux Megastructure',
    skyTop: '#090518',
    skyBottom: '#311042',
    accentColor: '#34D399',
    platformColor: '#0F172A',
    platformTrim: '#10B981',
    enemyTypes: ['chronoknight', 'astralturret', 'stalker'],
    bossNames: ['Omega Astral Sovereign', 'Celestial Flux Architect', 'Infinity Star Overlord'],
    bossTitle: 'Colossal Gravity-Shifting Galactic Overlord',
    bossModelIndex: 5,
    rewardSkill: 'astral_supernova',
    defaultGravityHint: 'Master rapid shifts and super weapons against the Astral Sovereign.',
  },
  {
    key: 'solar',
    titleBase: 'Solar Flare Bastion',
    realmLabel: 'Corona Orbit',
    biomeLabel: 'Sunburst Jets & Golden Rings',
    skyTop: '#451A03',
    skyBottom: '#B45309',
    accentColor: '#FDE047',
    platformColor: '#78350F',
    platformTrim: '#FBBF24',
    enemyTypes: ['harpy', 'prism', 'aeroturret'],
    bossNames: ['Helios Phoenix Battleship', 'Corona Titan Rex', 'Solaris Citadel Core'],
    bossTitle: 'Blazing Star-Forge Flagship',
    bossModelIndex: 2,
    rewardSkill: 'aether_wings',
    defaultGravityHint: 'Ride fiery solar thermals and keep moving through radiant flare waves.',
  },
  {
    key: 'cyber',
    titleBase: 'Neon Cyber Spire',
    realmLabel: 'Orbital Metropolis',
    biomeLabel: 'Holographic Bridges & Laser Grids',
    skyTop: '#020617',
    skyBottom: '#0F172A',
    accentColor: '#06B6D4',
    platformColor: '#1E293B',
    platformTrim: '#22D3EE',
    enemyTypes: ['saucer', 'astralturret', 'chronoknight'],
    bossNames: ['Mecha-Vortex Warden', 'Cyber-Hydra Matrix', 'Quantum Hyper-Core'],
    bossTitle: 'Giant Holographic Defense Mech',
    bossModelIndex: 4,
    rewardSkill: 'chrono_dilation',
    defaultGravityHint: 'Flip onto neon ceiling rails to bypass ground turrets cleanly.',
  },
  {
    key: 'forest',
    titleBase: 'Emerald Bio-Canopy',
    realmLabel: 'Floating Moon Jungle',
    biomeLabel: 'Luminous Vines & Spore Currents',
    skyTop: '#052E16',
    skyBottom: '#14532D',
    accentColor: '#4ADE80',
    platformColor: '#166534',
    platformTrim: '#86EFAC',
    enemyTypes: ['jelly', 'bat', 'stalker'],
    bossNames: ['Elder Canopy Wyrm', 'Spore-Crown Leviathan', 'Verdant Star Colossus'],
    bossTitle: 'Colossal Bioluminescent Guardian',
    bossModelIndex: 1,
    rewardSkill: 'tidal_shield',
    defaultGravityHint: 'Soar between floating moon-boughs using Zero-G and bounce pads.',
  },
  {
    key: 'glacial',
    titleBase: 'Glacial Comet Trench',
    realmLabel: 'Frozen Deep Space',
    biomeLabel: 'Aurora Ice Spires & Cryo Cavern',
    skyTop: '#082F49',
    skyBottom: '#0C4A6E',
    accentColor: '#7DD3FC',
    platformColor: '#164E63',
    platformTrim: '#BAE6FD',
    enemyTypes: ['puffer', 'golem', 'prism'],
    bossNames: ['Cryo-Mammoth Titan', 'Aurora Glacial Wyrm', 'Permafrost Star Fortress'],
    bossTitle: 'Colossal Crystalline Ice Titan',
    bossModelIndex: 3,
    rewardSkill: 'crystal_quake',
    defaultGravityHint: 'Watch icy magma-frost vents and use aerial combos to stay aloft.',
  },
  {
    key: 'forge',
    titleBase: 'Obsidian Star Forge',
    realmLabel: 'Core Crucible',
    biomeLabel: 'Molten Anvils & Gravity Furnaces',
    skyTop: '#2B0909',
    skyBottom: '#7C2D12',
    accentColor: '#FB923C',
    platformColor: '#451A03',
    platformTrim: '#F97316',
    enemyTypes: ['magmaslime', 'crab', 'chronoknight'],
    bossNames: ['Vulcan Forge Colossus', 'Crucible Dragon-Titan', 'Supernova Anvil King'],
    bossTitle: 'Molten Armored Crucible Juggernaut',
    bossModelIndex: 5,
    rewardSkill: 'astral_supernova',
    defaultGravityHint: 'Invert past molten streams and watch for hidden 10s Power Orbs!',
  },
];

const ZONE_MUTATORS = [
  { title: 'Crystal Bounce Springs', desc: 'Extra high-launch spring pads boost aerial chains.' },
  { title: 'Healing Coin Stream', desc: 'Extra health-recovery coins along high & low paths.' },
  { title: 'Zero-G Moonwalk Pocket', desc: 'Expanded gravity wells and soaring thermal lanes.' },
  { title: 'Guardian Swarm Wave', desc: 'More roaming guardians and bigger combo payoffs.' },
  { title: 'Boss Milestone Surge', desc: 'Tier-up speed surge & Super Weapon milestone boss!' },
];

const SECTOR_PREFIXES = [
  'Alpha',
  'Beta',
  'Gamma',
  'Delta',
  'Epsilon',
  'Zeta',
  'Nova',
  'Orion',
  'Vega',
  'Astra',
];

export function getZoneConfig(zoneId: number): ZoneConfig {
  const safeId = Math.max(1, Math.min(MAX_ZONE, Math.floor(zoneId || 1)));
  const template = BIOME_TEMPLATES[(safeId - 1) % BIOME_TEMPLATES.length];
  const tier = Math.floor((safeId - 1) / 5); // Increases every 5 zones (0..19)
  const sectorName = SECTOR_PREFIXES[Math.floor((safeId - 1) / 10) % SECTOR_PREFIXES.length];
  const mutator = ZONE_MUTATORS[(safeId - 1) % ZONE_MUTATORS.length];
  const bossIdx = (safeId - 1) % template.bossNames.length;
  const isMilestone = safeId % 5 === 0;

  return {
    id: safeId,
    key: template.key,
    tier,
    speedScale: Number((1 + tier * 0.13).toFixed(2)),
    enemyHpScale: Number((1 + tier * 0.34).toFixed(2)),
    bossModelIndex: template.bossModelIndex,
    mutatorTitle: isMilestone ? `Tier ${tier + 1} Boss Surge` : mutator.title,
    mutatorDesc: isMilestone
      ? 'Every 5th zone amps speed, enemy strength, and grants +2 Life Credits!'
      : mutator.desc,
    name: safeId <= 5 ? template.titleBase : `${sectorName} ${template.titleBase}`,
    subtitle: `Zone ${safeId} · ${template.realmLabel}`,
    biomeLabel: template.biomeLabel,
    skyTop: template.skyTop,
    skyBottom: template.skyBottom,
    accentColor: template.accentColor,
    platformColor: template.platformColor,
    platformTrim: template.platformTrim,
    enemyTypes: template.enemyTypes,
    bossName:
      safeId <= 5
        ? template.bossNames[0]
        : `${template.bossNames[bossIdx]} Mk.${Math.max(2, tier + 1)}`,
    bossTitle: template.bossTitle,
    bossHpBase: Math.round((850 + safeId * 165) * (1 + tier * 0.18)),
    rewardSkill: template.rewardSkill,
    levelLength: Math.min(6200, 3400 + (safeId % 6) * 260 + tier * 75),
    defaultGravityHint: template.defaultGravityHint,
  };
}

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  sword: {
    id: 'sword',
    name: 'Starlight Blade',
    subtitle: 'Magical Melee Sword',
    comboNames: ['Crescent Slash', 'Rising Void Cleave', 'Gravity Meteor Slam'],
    description: 'Wide melee arcs that deflect enemy projectiles. Step 3 unleashes a shockwave.',
    color: '#EC4899',
    isSuper: false,
    unlockZone: 1,
  },
  gun: {
    id: 'gun',
    name: 'Prism Blaster',
    subtitle: 'Aether Pulse Sidearm',
    comboNames: ['Aether Bolt', 'Twin Scatter Pulse', 'Hyper-Rail Beam'],
    description: 'Long-range rapid fire with mid-air recoil hop. Step 3 fires a piercing rail beam.',
    color: '#38BDF8',
    isSuper: false,
    unlockZone: 1,
  },
  staff: {
    id: 'staff',
    name: 'Orbital Nova Staff',
    subtitle: 'Graviton Orb Caster',
    comboNames: ['Arc Spark', 'Orbiting Ring', 'Supernova Detonation'],
    description: 'Launches returning gravity orbs that pull enemies and detonate on Step 3.',
    color: '#A855F7',
    isSuper: false,
    unlockZone: 1,
  },
  super_spread_fireball: {
    id: 'super_spread_fireball',
    name: 'Spread Fireball',
    subtitle: 'Super Gun · Zone 5 Unlock',
    comboNames: ['3-Way Ember Fan', '5-Way Blazing Spread', '7-Orb Phoenix Salvo'],
    description: 'Fires wide multi-angle fans of blazing fireballs that explode on impact.',
    color: '#F97316',
    isSuper: true,
    unlockZone: 5,
  },
  super_ultra_laser: {
    id: 'super_ultra_laser',
    name: 'Ultra Beam Laser',
    subtitle: 'Super Gun · Zone 10 Unlock',
    comboNames: ['Horizon Laser', 'Mega Beam Sweep', 'Half-Screen Ultra Beam'],
    description: 'Unleashes a straight horizontal glowing laser as tall as half the screen across to the edge.',
    color: '#22D3EE',
    isSuper: true,
    unlockZone: 10,
  },
  super_laser_sword: {
    id: 'super_laser_sword',
    name: 'Super Long Laser Sword',
    subtitle: 'Super Weapon · Zone 15 Unlock',
    comboNames: ['Extended Plasma Slash', 'Dual Ripple Arc', 'Horizon Ripple Tempest'],
    description: 'Ultra-long laser blade that deflects shots and throws crescent ripple beams across the screen.',
    color: '#E879F9',
    isSuper: true,
    unlockZone: 15,
  },
  super_round_fireball: {
    id: 'super_round_fireball',
    name: 'Round Super Fireball',
    subtitle: 'Super Gun · Zone 20 Unlock',
    comboNames: ['Solar Sphere', 'Giant Inferno Orb', 'Supernova Sun Sphere'],
    description: 'Launches colossal spinning round fireballs that melt enemies with massive fiery blasts.',
    color: '#FACC15',
    isSuper: true,
    unlockZone: 20,
  },
  super_machine_gun: {
    id: 'super_machine_gun',
    name: 'Speed Machine Gun',
    subtitle: 'Super Gun · Zone 25 Unlock',
    comboNames: ['Hyper Burst', 'Gatling Velocity Stream', 'Supersonic Bullet Storm'],
    description: 'Extreme fire-rate machine gun firing hyper-velocity speed bullets across the arena.',
    color: '#4ADE80',
    isSuper: true,
    unlockZone: 25,
  },
};

export const WEAPON_ORDER: WeaponId[] = [
  'sword',
  'gun',
  'staff',
  'super_spread_fireball',
  'super_ultra_laser',
  'super_laser_sword',
  'super_round_fireball',
  'super_machine_gun',
];

export const SPECIAL_SKILLS: Record<SkillId, SpecialSkillConfig> = {
  tidal_shield: {
    id: 'tidal_shield',
    name: 'Tidal Bubble Shield',
    unlockZone: 1,
    cooldownSec: 12,
    description: 'Grants a 4.5s water-aether shield that blocks hits and blasts nearby foes away.',
    color: '#22D3EE',
  },
  aether_wings: {
    id: 'aether_wings',
    name: 'Skyward Aether Wings',
    unlockZone: 2,
    cooldownSec: 10,
    description: 'Activates 4.5s free-flight thrust and fires twin golden wind blades.',
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
  {
    id: 'original_ruffle',
    slot: 'outfit',
    name: 'Rose Princess Gown',
    description: 'Sparkling pink & gold floral princess outfit with Sky Runner boots.',
    cost: 0,
    primaryColor: '#EC4899',
    secondaryColor: '#FDE047',
    accentColor: '#F9A8D4',
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
    description: 'Prismatic starlight suit crafted for 100-zone gravity masters.',
    cost: 180,
    primaryColor: '#10B981',
    secondaryColor: '#090D1F',
    accentColor: '#38BDF8',
  },
  {
    id: 'pink_blue_round',
    slot: 'glasses',
    name: 'Crystal Tiara Glint',
    description: 'Classic clean portrait look (or subtle rose-pearl frames).',
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
  {
    id: 'high_ponytail',
    slot: 'hair',
    name: 'Royal Rose Tiara',
    description: 'Sleek royal bun adorned with a sparkling diamond tiara.',
    cost: 0,
    primaryColor: '#2C1810',
    secondaryColor: '#FDE047',
    accentColor: '#F472B6',
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
  {
    id: 'pedestal_spark',
    slot: 'aura',
    name: 'Rose Garden Halo',
    description: 'Luminous silver-pink hover ring beneath Sky Runner.',
    cost: 0,
    primaryColor: '#FCE7F3',
    secondaryColor: '#EC4899',
    accentColor: '#FDE047',
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
    lifeCredits: 3,
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
    customPhotoDataUrl: null,
    usePhotoCharacter: true,
  };
}
