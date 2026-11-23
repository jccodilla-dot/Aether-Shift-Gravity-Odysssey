import React, { useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Gift,
  Lock,
  Share2,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {
  COSMETICS,
  DAILY_LOGIN_REWARDS,
  getDailyChallengesForDate,
  getTodayDateKey,
  SPECIAL_SKILLS,
  ZONES,
} from '../game/catalog';
import { gameAudio } from '../game/audio';
import { CosmeticSlot, LeaderboardEntry, PlayerProfile, SkillId, ZoneId } from '../game/types';
import { AvatarPreviewCanvas } from './AvatarPreviewCanvas';

interface WardrobeModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (next: PlayerProfile) => void;
}

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  profile,
  onClose,
  onUpdateProfile,
}) => {
  const [tab, setTab] = useState<'cosmetics' | 'skills'>('cosmetics');
  const [slot, setSlot] = useState<CosmeticSlot>('outfit');

  const items = COSMETICS.filter((c) => c.slot === slot);

  const isEquipped = (id: string, itemSlot: CosmeticSlot) => {
    if (itemSlot === 'outfit') return profile.equippedOutfit === id;
    if (itemSlot === 'glasses') return profile.equippedGlasses === id;
    if (itemSlot === 'hair') return profile.equippedHair === id;
    return profile.equippedAura === id;
  };

  const equipOrBuy = (id: string, itemSlot: CosmeticSlot, cost: number) => {
    const unlocked = profile.unlockedCosmetics.includes(id);
    if (!unlocked) {
      if (profile.challengeCurrency < cost) return;
      gameAudio.playRewardChime();
      const updated: PlayerProfile = {
        ...profile,
        challengeCurrency: profile.challengeCurrency - cost,
        unlockedCosmetics: [...profile.unlockedCosmetics, id],
        equippedOutfit: itemSlot === 'outfit' ? id : profile.equippedOutfit,
        equippedGlasses: itemSlot === 'glasses' ? id : profile.equippedGlasses,
        equippedHair: itemSlot === 'hair' ? id : profile.equippedHair,
        equippedAura: itemSlot === 'aura' ? id : profile.equippedAura,
      };
      onUpdateProfile(updated);
    } else {
      gameAudio.playUiClick();
      onUpdateProfile({
        ...profile,
        equippedOutfit: itemSlot === 'outfit' ? id : profile.equippedOutfit,
        equippedGlasses: itemSlot === 'glasses' ? id : profile.equippedGlasses,
        equippedHair: itemSlot === 'hair' ? id : profile.equippedHair,
        equippedAura: itemSlot === 'aura' ? id : profile.equippedAura,
      });
    }
  };

  const upgradeStat = (stat: 'vitalityLevel' | 'powerLevel' | 'gravMasteryLevel') => {
    const level = profile[stat];
    if (level >= 10) return;
    const cost = level * 60;
    if (profile.starCoins < cost) return;
    gameAudio.playRewardChime();
    onUpdateProfile({
      ...profile,
      starCoins: profile.starCoins - cost,
      [stat]: level + 1,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0D1326] text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Avatar Studio & Skills</h2>
            <p className="text-xs text-slate-400">
              Prism Shards (Daily Challenges): <span className="font-mono-num font-bold text-pink-400">{profile.challengeCurrency}</span>
              <span className="mx-2">·</span>
              Starlight Coins (Combat): <span className="font-mono-num font-bold text-amber-400">{profile.starCoins}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setTab('cosmetics')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'cosmetics' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Wardrobe
              </button>
              <button
                type="button"
                onClick={() => setTab('skills')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'skills' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Skills & Upgrades
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Wardrobe"
              className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'cosmetics' ? (
            <div className="grid gap-6 md:grid-cols-[220px_1fr]">
              <div className="flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <AvatarPreviewCanvas profile={profile} size={172} />
                <p className="mt-2 text-center text-xs text-slate-400">
                  Clothes & looks require <span className="font-semibold text-pink-400">Prism Shards</span> earned exclusively from Daily Challenges & Daily Login Rewards.
                </p>
              </div>

              <div>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {(['outfit', 'glasses', 'hair', 'aura'] as CosmeticSlot[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                        slot === s
                          ? 'bg-slate-100 text-slate-950'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s === 'outfit' ? 'Clothes' : s === 'aura' ? 'Hover Trail' : s}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((item) => {
                    const owned = profile.unlockedCosmetics.includes(item.id);
                    const equipped = isEquipped(item.id, item.slot);
                    const canAfford = profile.challengeCurrency >= item.cost;

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-white text-sm">{item.name}</h3>
                            <div className="flex items-center gap-1">
                              <span
                                className="h-3 w-3 rounded-full border border-white/20"
                                style={{ backgroundColor: item.primaryColor }}
                              />
                              <span
                                className="h-3 w-3 rounded-full border border-white/20"
                                style={{ backgroundColor: item.secondaryColor }}
                              />
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => equipOrBuy(item.id, item.slot, item.cost)}
                          disabled={!owned && !canAfford}
                          className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                            equipped
                              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                              : owned
                              ? 'bg-slate-800 text-white hover:bg-slate-700'
                              : canAfford
                              ? 'bg-pink-600 text-white hover:bg-pink-500'
                              : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {equipped
                            ? 'Equipped'
                            : owned
                            ? 'Equip Look'
                            : `Unlock · ${item.cost} Prism Shards`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-200 mb-3">
                  Stage-Completion Special Skills
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(SPECIAL_SKILLS) as SkillId[]).map((skillId) => {
                    const sk = SPECIAL_SKILLS[skillId];
                    const unlocked = profile.unlockedSkills.includes(skillId);
                    return (
                      <div
                        key={skillId}
                        className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-white">{sk.name}</span>
                          {unlocked ? (
                            <Sparkles className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Lock className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{sk.description}</p>
                        <p className="mt-2 font-mono-num text-[11px] text-slate-500">
                          {unlocked
                            ? `Unlocked · Cooldown ${sk.cooldownSec}s`
                            : `Clear Zone ${sk.unlockZone} (${ZONES[sk.unlockZone].name})`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm font-bold text-slate-200 mb-3">
                  Combat & Gravity Mastery Upgrades (Starlight Coins)
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      key: 'vitalityLevel' as const,
                      title: 'Vitality Core',
                      desc: '+20 Max HP per rank.',
                    },
                    {
                      key: 'powerLevel' as const,
                      title: 'Weapon Overdrive',
                      desc: '+22% Sword, Blaster & Staff damage.',
                    },
                    {
                      key: 'gravMasteryLevel' as const,
                      title: 'Gravity Mastery',
                      desc: 'Faster air stride & longer Shift-Combo timer.',
                    },
                  ].map((u) => {
                    const lv = profile[u.key];
                    const cost = lv * 60;
                    const maxed = lv >= 10;
                    return (
                      <div
                        key={u.key}
                        className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-white">{u.title}</span>
                            <span className="font-mono-num text-xs text-sky-400">Lv {lv}/10</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{u.desc}</p>
                        </div>
                        <button
                          type="button"
                          disabled={maxed || profile.starCoins < cost}
                          onClick={() => upgradeStat(u.key)}
                          className="mt-4 w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500"
                        >
                          {maxed ? 'Max Level' : `Upgrade · ${cost} Coins`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface DailyModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onClaimDailyLogin: () => void;
}

export const DailyModal: React.FC<DailyModalProps> = ({
  profile,
  onClose,
  onClaimDailyLogin,
}) => {
  const todayKey = getTodayDateKey();
  const challenges = getDailyChallengesForDate(todayKey);
  const claimedToday = profile.lastDailyClaimDate === todayKey;
  const currentDayIndex = Math.min(6, profile.dailyStreak % 7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0D1326] text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Daily Rewards & Challenges</h2>
            <p className="text-xs text-slate-400">
              Complete difficult daily runs to earn Prism Shards for avatar customization.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Modal"
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 7-Day Login Streak */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-400" />
                  7-Day Login Streak · Current Streak: {profile.dailyStreak} Days
                </h3>
              </div>
              <button
                type="button"
                disabled={claimedToday}
                onClick={onClaimDailyLogin}
                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-400"
              >
                {claimedToday ? 'Claimed Today' : 'Claim Daily Reward'}
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DAILY_LOGIN_REWARDS.map((rew, i) => {
                const past = i < currentDayIndex || (claimedToday && i === currentDayIndex);
                const active = !claimedToday && i === currentDayIndex;
                return (
                  <div
                    key={rew.day}
                    className={`rounded-lg border p-2.5 text-center ${
                      active
                        ? 'border-amber-400 bg-amber-500/15'
                        : past
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-slate-800 bg-slate-950/50'
                    }`}
                  >
                    <div className="text-[11px] font-semibold text-slate-300">{rew.label}</div>
                    <div className="mt-1 font-mono-num text-xs font-bold text-pink-400">
                      +{rew.shards} Shards
                    </div>
                    <div className="font-mono-num text-[10px] text-amber-400">+{rew.coins} Coins</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Difficult Daily Challenges */}
          <div>
            <h3 className="font-display text-sm font-bold text-white mb-3">
              Today&apos;s Challenges ({todayKey})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {challenges.map((ch) => {
                const done = profile.completedDailyChallenges.includes(ch.id);
                return (
                  <div
                    key={ch.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-white">{ch.title}</span>
                        <span className="font-mono-num text-xs font-bold text-pink-400">
                          +{ch.rewardShards} Shards
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{ch.description}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
                      {done ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="text-slate-400">Active · Complete in any Zone run</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface LeaderboardModalProps {
  entries: LeaderboardEntry[];
  profile: PlayerProfile;
  selectedZone: ZoneId;
  isOnline: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  entries,
  profile,
  selectedZone,
  isOnline,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = (() => {
    const url = new URL(window.location.href);
    url.searchParams.set('challenger', profile.displayName);
    url.searchParams.set('target', String(Math.max(1500, profile.highScore)));
    url.searchParams.set('zone', String(selectedZone));
    url.searchParams.set('weapon', profile.equippedWeapon);
    return url.toString();
  })();

  const handleShare = async () => {
    gameAudio.playUiClick();
    const shareText = `Can you beat my ${profile.highScore.toLocaleString()} score in Aether Shift: Gravity Odyssey (Zone ${selectedZone})?`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Aether Shift Challenge',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0D1326] text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Global Leaderboard
            </h2>
            <p className="text-xs text-slate-400">
              {isOnline ? 'Live Cloud Rankings' : 'Offline Cached Rankings'} · Personal Best:{' '}
              <span className="font-mono-num font-bold text-white">{profile.highScore.toLocaleString()}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Leaderboard"
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Social Share Challenge Card */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pink-500/30 bg-pink-500/10 p-4">
            <div>
              <h3 className="text-sm font-bold text-white">Challenge Your Friends</h3>
              <p className="text-xs text-slate-300">
                Share a direct duel link with your high score, zone, and weapon loadout.
              </p>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-xs font-semibold text-white hover:bg-pink-500 transition-colors"
            >
              {copied ? <Copy className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? 'Challenge Copied' : 'Share Challenge Link'}
            </button>
          </div>

          {/* Rankings Table */}
          {entries.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
              Sign in with Google and complete a run to post the first score on the global leaderboard.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-900/50">
              {entries.map((row, idx) => (
                <div key={row.uid} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono-num w-6 text-xs font-bold text-slate-400">
                      {idx === 0 ? <Crown className="h-4 w-4 text-amber-400" /> : `#${idx + 1}`}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">{row.playerName}</div>
                      <div className="text-xs text-slate-400">
                        Zone {row.zoneReached} · {row.weapon.toUpperCase()} · {row.difficultyPeak.toFixed(1)}x Pace
                      </div>
                    </div>
                  </div>
                  <div className="font-mono-num font-bold text-sky-300">
                    {row.score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
