import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Cloud,
  CloudOff,
  Gamepad2,
  Gift,
  Heart,
  Infinity as InfinityIcon,
  LogOut,
  Music,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Shirt,
  Sparkles,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AvatarPreviewCanvas } from './components/AvatarPreviewCanvas';
import {
  CreatorDonateFeedbackModal,
  StudioTab,
} from './components/CreatorDonateFeedbackModal';
import { DailyModal, LeaderboardModal, WardrobeModal } from './components/MetaModals';
import { PWAInstallButton } from './components/PWAInstallButton';
import { TouchControls } from './components/TouchControls';
import { gameAudio } from './game/audio';
import {
  CHARACTER_REFERENCE_IMAGE,
  DAILY_LOGIN_REWARDS,
  getDailyChallengesForDate,
  getTodayDateKey,
  GRAVITY_ORDER,
  GRAVITY_PRESETS,
  SPECIAL_SKILLS,
  WEAPONS,
  ZONES,
} from './game/catalog';
import { GravityPlatformerEngine } from './game/engine';
import {
  ChallengeTarget,
  GameScreenState,
  GravityPreset,
  HudSnapshot,
  LeaderboardEntry,
  PlayerProfile,
  SkillId,
  WeaponId,
  ZoneId,
} from './game/types';
import { drawZoneBackground } from './game/zoneRenderer';
import {
  auth,
  signInWithGoogle,
  signOutPlayer,
  testConnection,
} from './services/firebase';
import {
  fetchGlobalLeaderboard,
  hasPendingSync,
  loadCachedLeaderboard,
  loadLocalProfile,
  pushProfileToCloud,
  saveLocalProfile,
  submitLeaderboardScore,
  syncProfileWithCloud,
} from './services/syncService';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadLocalProfile());
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncing, setSyncing] = useState(false);

  const [screen, setScreen] = useState<GameScreenState>('TITLE');
  const [selectedZone, setSelectedZone] = useState<ZoneId>(1);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [runSummary, setRunSummary] = useState<{
    hud: HudSnapshot;
    newlyUnlockedSkill: SkillId | null;
    completedChallenges: string[];
    shardsEarned: number;
  } | null>(null);

  const [activeModal, setActiveModal] = useState<'wardrobe' | 'daily' | 'leaderboard' | 'studio' | null>(null);
  const [studioTab, setStudioTab] = useState<StudioTab>('creator');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadCachedLeaderboard());
  const [showTouchPad, setShowTouchPad] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  const [sfxOn, setSfxOn] = useState(gameAudio.sfxEnabled);
  const [musicOn, setMusicOn] = useState(gameAudio.musicEnabled);

  const gameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const titleBgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GravityPlatformerEngine | null>(null);

  // Incoming Friend Challenge URL params
  const friendChallenge = useMemo<ChallengeTarget | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const challenger = params.get('challenger');
    const target = Number(params.get('target'));
    const zone = Number(params.get('zone')) as ZoneId;
    const weapon = params.get('weapon') as WeaponId;
    if (!challenger || !target) return null;
    return {
      playerName: challenger.slice(0, 32),
      targetScore: target,
      zoneId: zone >= 1 && zone <= 5 ? zone : 1,
      weapon: weapon === 'sword' || weapon === 'gun' || weapon === 'staff' ? weapon : 'sword',
    };
  }, []);

  // Persist & Cloud-sync helper
  const updateProfile = useCallback(
    (next: PlayerProfile) => {
      setProfile(next);
      saveLocalProfile(next);
      engineRef.current?.updateProfile(next);
      if (user) {
        pushProfileToCloud(user.uid, next).catch(() => {});
      }
    },
    [user]
  );

  // Connectivity + Startup Firestore connection check
  useEffect(() => {
    testConnection();
    const onOnline = () => {
      setIsOnline(true);
      if (auth.currentUser && hasPendingSync()) {
        syncProfileWithCloud(auth.currentUser.uid, loadLocalProfile(), auth.currentUser.displayName)
          .then((merged) => setProfile(merged))
          .catch(() => {});
      }
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Auth listener for seamless cross-platform Cloud Sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser && navigator.onLine) {
        setSyncing(true);
        try {
          const merged = await syncProfileWithCloud(
            fbUser.uid,
            loadLocalProfile(),
            fbUser.displayName
          );
          setProfile(merged);
        } catch {
          // fallback to local
        } finally {
          setSyncing(false);
        }
      }
    });
    return () => unsub();
  }, []);

  // Animated Title Screen Background matching currently hovered/selected Zone
  useEffect(() => {
    if (screen !== 'TITLE') return;
    const canvas = titleBgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();

    const renderBg = (now: number) => {
      raf = requestAnimationFrame(renderBg);
      const t = (now - start) / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      drawZoneBackground(ctx, selectedZone, t * 48, w, h, t);
      ctx.restore();
    };
    raf = requestAnimationFrame(renderBg);
    return () => cancelAnimationFrame(raf);
  }, [screen, selectedZone]);

  // Finish Stage / Game Over Handler
  const finalizeRun = useCallback(
    (summaryHud: HudSnapshot, victory: boolean) => {
      const todayKey = getTodayDateKey();
      const challenges = getDailyChallengesForDate(todayKey);
      let shardsEarned = 0;
      const newlyCompleted: string[] = [];

      for (const ch of challenges) {
        if (profile.completedDailyChallenges.includes(ch.id)) continue;
        let met = false;
        if (ch.metric === 'inverted_gems' && summaryHud.runInvertedGems >= ch.target) met = true;
        if (ch.metric === 'combo_finishers' && summaryHud.runComboFinishers >= ch.target) met = true;
        if (ch.metric === 'midair_shifts' && summaryHud.runMidAirShifts >= ch.target) met = true;
        if (ch.metric === 'shift_score' && summaryHud.runShiftScore >= ch.target) met = true;
        if (ch.metric === 'boss_hardcore' && victory && !summaryHud.infiniteLife) met = true;

        if (met) {
          newlyCompleted.push(ch.id);
          shardsEarned += ch.rewardShards;
        }
      }

      const zoneCfg = ZONES[summaryHud.zoneId];
      let newlyUnlockedSkill: SkillId | null = null;
      const nextSkills = [...profile.unlockedSkills];
      if (victory && !nextSkills.includes(zoneCfg.rewardSkill)) {
        nextSkills.push(zoneCfg.rewardSkill);
        newlyUnlockedSkill = zoneCfg.rewardSkill;
      }

      const nextProfile: PlayerProfile = {
        ...profile,
        starCoins: profile.starCoins + summaryHud.runCoins,
        challengeCurrency: profile.challengeCurrency + shardsEarned,
        unlockedZone: victory
          ? Math.max(profile.unlockedZone, Math.min(5, summaryHud.zoneId + 1))
          : profile.unlockedZone,
        unlockedSkills: nextSkills,
        completedDailyChallenges: [
          ...profile.completedDailyChallenges,
          ...newlyCompleted,
        ].slice(-30),
        highScore: Math.max(profile.highScore, summaryHud.score),
      };

      updateProfile(nextProfile);
      setRunSummary({
        hud: summaryHud,
        newlyUnlockedSkill,
        completedChallenges: newlyCompleted,
        shardsEarned,
      });

      if (user && navigator.onLine) {
        submitLeaderboardScore(user.uid, {
          playerName: nextProfile.displayName,
          score: nextProfile.highScore,
          zoneReached: summaryHud.zoneId,
          weapon: summaryHud.weapon,
          outfitId: nextProfile.equippedOutfit,
          difficultyPeak: summaryHud.difficultyMultiplier,
        }).catch(() => {});
      }

      setScreen(victory ? 'STAGE_CLEAR' : 'GAME_OVER');
    },
    [profile, updateProfile, user]
  );

  // Start a Run
  const startZoneRun = useCallback(
    (zoneId: ZoneId) => {
      gameAudio.unlock();
      gameAudio.playUiClick();
      setSelectedZone(zoneId);
      setRunSummary(null);
      setScreen('PLAYING');

      // Mount engine on next animation frame when canvas is rendered
      requestAnimationFrame(() => {
        if (!gameCanvasRef.current) return;
        engineRef.current?.destroy();
        const engine = new GravityPlatformerEngine(gameCanvasRef.current, profile, zoneId, {
          onHudUpdate: (snapshot) => setHud(snapshot),
          onStageClear: (snapshot) => finalizeRun(snapshot, true),
          onGameOver: (snapshot) => finalizeRun(snapshot, false),
          onPauseRequest: () => {
            setScreen((prev) => {
              if (prev === 'PLAYING') {
                engineRef.current?.setPaused(true);
                return 'PAUSED';
              }
              if (prev === 'PAUSED') {
                engineRef.current?.setPaused(false);
                return 'PLAYING';
              }
              return prev;
            });
          },
        });
        engineRef.current = engine;
        setHud(engine.getHudSnapshot());
        engine.start();
      });
    },
    [finalizeRun, profile]
  );

  // Cleanup engine on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  // Enter / Space starts game from Title Screen
  useEffect(() => {
    if (screen !== 'TITLE' || activeModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        startZoneRun(selectedZone);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, activeModal, selectedZone, startZoneRun]);

  const handleOpenLeaderboard = async () => {
    gameAudio.playUiClick();
    setActiveModal('leaderboard');
    const rows = await fetchGlobalLeaderboard();
    setLeaderboard(rows);
  };

  const handleClaimDailyLogin = () => {
    const todayKey = getTodayDateKey();
    if (profile.lastDailyClaimDate === todayKey) return;
    const idx = Math.min(6, profile.dailyStreak % 7);
    const reward = DAILY_LOGIN_REWARDS[idx];
    gameAudio.playRewardChime();
    updateProfile({
      ...profile,
      challengeCurrency: profile.challengeCurrency + reward.shards,
      starCoins: profile.starCoins + reward.coins,
      dailyStreak: profile.dailyStreak + 1,
      lastDailyClaimDate: todayKey,
    });
  };

  const toggleSfx = () => {
    const next = !sfxOn;
    gameAudio.setSfxEnabled(next);
    setSfxOn(next);
    if (next) gameAudio.playUiClick();
  };

  const toggleMusic = () => {
    const next = !musicOn;
    gameAudio.setMusicEnabled(next);
    setMusicOn(next);
  };

  const toggleInfiniteLife = () => {
    gameAudio.playUiClick();
    updateProfile({ ...profile, infiniteLife: !profile.infiniteLife });
  };

  const todayChallenges = useMemo(() => getDailyChallengesForDate(getTodayDateKey()), []);
  const dailyAvailable = profile.lastDailyClaimDate !== getTodayDateKey();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070B19] text-slate-100">
      {/* ==================== TITLE SCREEN ==================== */}
      {screen === 'TITLE' && (
        <div className="relative flex h-full w-full flex-col justify-between overflow-y-auto">
          <canvas
            ref={titleBgCanvasRef}
            className="pointer-events-none fixed inset-0 h-full w-full opacity-90"
          />
          <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/45 to-slate-950/90" />

          {/* Top Compact Utility Strip */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-5 pt-4 sm:px-8">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                {isOnline ? (
                  <Cloud className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <CloudOff className="h-3.5 w-3.5 text-amber-400" />
                )}
                {isOnline ? (syncing ? 'Syncing Cloud...' : user ? 'Cloud Synced' : 'Online Ready') : 'Offline Mode'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Prism Shards: <strong className="font-mono-num text-pink-400">{profile.challengeCurrency}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Coins: <strong className="font-mono-num text-amber-400">{profile.starCoins}</strong></span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PWAInstallButton />
              <button
                type="button"
                onClick={toggleSfx}
                aria-label="Toggle Sound Effects"
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  sfxOn ? 'border-slate-700 bg-slate-900/80 text-white' : 'border-rose-500/40 bg-rose-950/60 text-rose-300'
                }`}
              >
                {sfxOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                SFX
              </button>
              <button
                type="button"
                onClick={toggleMusic}
                aria-label="Toggle Music"
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  musicOn ? 'border-slate-700 bg-slate-900/80 text-white' : 'border-rose-500/40 bg-rose-950/60 text-rose-300'
                }`}
              >
                <Music className="h-3.5 w-3.5" />
                {musicOn ? 'Music On' : 'Muted'}
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={() => signOutPlayer()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {profile.displayName}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => signInWithGoogle().catch(() => {})}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-white"
                >
                  Cloud Sign In
                </button>
              )}
            </div>
          </div>

          {/* Main Hero Staging */}
          <div className="relative z-10 mx-auto my-auto grid w-full max-w-6xl items-center gap-6 px-5 py-4 lg:grid-cols-[1.25fr_0.85fr] sm:px-8">
            <div className="space-y-5">
              {friendChallenge && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-xs text-amber-200">
                  Friend Challenge from <strong>{friendChallenge.playerName}</strong> · Beat{' '}
                  <strong className="font-mono-num">{friendChallenge.targetScore.toLocaleString()}</strong> in Zone{' '}
                  {friendChallenge.zoneId}
                </div>
              )}

              {/* Bespoke Inline SVG Title Lockup */}
              <div>
                <svg viewBox="0 0 520 96" className="h-16 w-auto max-w-full sm:h-20" role="img" aria-label="Aether Shift">
                  <defs>
                    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F8FAFC" />
                      <stop offset="55%" stopColor="#F472B6" />
                      <stop offset="100%" stopColor="#38BDF8" />
                    </linearGradient>
                  </defs>
                  <text
                    x="0"
                    y="62"
                    fill="url(#titleGrad)"
                    fontFamily="Outfit, sans-serif"
                    fontWeight="800"
                    fontSize="60"
                    letterSpacing="-1.5"
                  >
                    AETHER SHIFT
                  </text>
                  <text
                    x="2"
                    y="88"
                    fill="#94A3B8"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight="600"
                    fontSize="16"
                    letterSpacing="3.5"
                  >
                    GRAVITY ODYSSEY · SEA TO GALAXY
                  </text>
                </svg>
              </div>

              {/* 5 Galactic & Planetary Zones Selector */}
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">Select Exploration Zone</span>
                  <span>{ZONES[selectedZone].biomeLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {([1, 2, 3, 4, 5] as ZoneId[]).map((zId) => {
                    const z = ZONES[zId];
                    const active = selectedZone === zId;
                    const cleared = profile.unlockedSkills.includes(z.rewardSkill);
                    return (
                      <button
                        key={zId}
                        type="button"
                        onClick={() => {
                          gameAudio.playUiClick();
                          setSelectedZone(zId);
                        }}
                        className={`rounded-xl border p-2.5 text-left transition-colors ${
                          active
                            ? 'border-pink-400 bg-slate-900/95'
                            : 'border-slate-800 bg-slate-950/75 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span style={{ color: z.accentColor }}>Zone {zId}</span>
                          {cleared && <Sparkles className="h-3 w-3 text-emerald-400" />}
                        </div>
                        <div className="mt-0.5 truncate text-xs font-semibold text-white">
                          {z.name.split(' ')[0]} {z.name.split(' ')[1]}
                        </div>
                        <div className="truncate text-[10px] text-slate-400">
                          {z.subtitle.split('·')[1]?.trim()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weapon Loadout Selector */}
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">Weapon & 3-Hit Combo</span>
                  <span className="text-slate-400">{WEAPONS[profile.equippedWeapon].comboNames.join(' → ')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['sword', 'gun', 'staff'] as WeaponId[]).map((wId) => {
                    const w = WEAPONS[wId];
                    const active = profile.equippedWeapon === wId;
                    return (
                      <button
                        key={wId}
                        type="button"
                        onClick={() => {
                          gameAudio.playUiClick();
                          updateProfile({ ...profile, equippedWeapon: wId });
                        }}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? 'border-sky-400 bg-slate-900/95'
                            : 'border-slate-800 bg-slate-950/75 hover:border-slate-600'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{w.name}</div>
                        <div className="text-[11px] text-slate-400">{w.subtitle}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary CTA + Infinite Life Toggle + Meta Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => startZoneRun(selectedZone)}
                  className="flex items-center gap-2.5 rounded-xl bg-pink-600 px-6 py-3.5 font-display text-base font-bold text-white shadow-lg shadow-pink-600/25 hover:bg-pink-500 transition-colors"
                >
                  <Play className="h-5 w-5 fill-current" />
                  Launch Zone {selectedZone}
                </button>

                <button
                  type="button"
                  onClick={toggleInfiniteLife}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition-colors ${
                    profile.infiniteLife
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <InfinityIcon className="h-4 w-4" />
                  Infinite Life: {profile.infiniteLife ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playUiClick();
                    setActiveModal('wardrobe');
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/85 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Shirt className="h-4 w-4 text-pink-400" />
                  Wardrobe & Skills
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playUiClick();
                    setActiveModal('daily');
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/85 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Gift className="h-4 w-4 text-amber-400" />
                  {dailyAvailable ? 'Claim Daily Reward' : `Daily (${todayChallenges.length})`}
                </button>

                <button
                  type="button"
                  onClick={handleOpenLeaderboard}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/85 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Trophy className="h-4 w-4 text-sky-400" />
                  Leaderboard & Share
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playUiClick();
                    setStudioTab('creator');
                    setActiveModal('studio');
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/85 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Sparkles className="h-4 w-4 text-sky-300" />
                  JMC Labs
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playUiClick();
                    setStudioTab('donate');
                    setActiveModal('studio');
                  }}
                  className="flex items-center gap-2 rounded-lg border border-pink-500/40 bg-pink-500/15 px-3.5 py-2 text-xs font-semibold text-pink-200 hover:bg-pink-500/25"
                >
                  <Heart className="h-4 w-4 text-pink-400" />
                  Donate
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playUiClick();
                    setStudioTab('feedback');
                    setActiveModal('studio');
                  }}
                  className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
                >
                  Comments
                </button>
              </div>
            </div>

            {/* Right Showcase Card: Reference Character + Live Customized Sprite */}
            <div className="rounded-2xl border border-slate-800/90 bg-slate-950/75 p-5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span className="font-semibold text-white">{profile.displayName}</span>
                <span>Best Score: <strong className="font-mono-num text-sky-300">{profile.highScore.toLocaleString()}</strong></span>
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                  <img
                    src={CHARACTER_REFERENCE_IMAGE}
                    alt="Hero Character Inspiration"
                    referrerPolicy="no-referrer"
                    className="h-44 w-full object-cover object-top"
                  />
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 py-2">
                  <AvatarPreviewCanvas profile={profile} size={150} />
                  <span className="text-[11px] font-medium text-slate-400">Live In-Game Look</span>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-300">
                <div className="font-semibold text-white">
                  Master Boss: {ZONES[selectedZone].bossName}
                </div>
                <div className="mt-0.5 text-slate-400">
                  {ZONES[selectedZone].defaultGravityHint}
                </div>
              </div>
            </div>
          </div>

          {/* Flat Single Control Hint Line */}
          <div className="relative z-10 px-5 pb-4 text-center text-xs text-slate-400">
            AD Move · Space Jump · F Flip -1G · 1-5 / Q-E Gravity Level · J Weapon Combo · R Special Skill · Esc Pause
          </div>
        </div>
      )}

      {/* ==================== ACTIVE GAMEPLAY VIEW ==================== */}
      {screen !== 'TITLE' && (
        <div className="relative h-full w-full overflow-hidden">
          <canvas ref={gameCanvasRef} className="block h-full w-full" />

          {/* Unobtrusive Top Perimeter HUD */}
          {hud && (
            <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-3 sm:p-4">
              {/* Top-Left Status Cluster */}
              <div className="flex flex-col gap-1.5 rounded-xl bg-slate-950/75 px-3.5 py-2.5 border border-white/10">
                <div className="flex items-center gap-3">
                  {hud.infiniteLife ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-300">
                      <InfinityIcon className="h-4 w-4" />
                      INVINCIBLE
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-rose-400 fill-rose-400" />
                      <div className="h-2.5 w-28 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-rose-500 transition-all duration-150"
                          style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono-num text-xs font-bold text-white">
                        {hud.hp}/{hud.maxHp}
                      </span>
                    </div>
                  )}
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-mono-num text-sm font-bold text-sky-300">
                    {hud.score.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-[11px] text-slate-300">
                  <span>{ZONES[hud.zoneId].name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{hud.progressPct}%</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num text-amber-300">Pace {hud.difficultyMultiplier.toFixed(2)}x</span>
                  {hud.shiftCombo > 1 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num font-bold text-yellow-300">
                        SHIFT x{hud.shiftCombo}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Top-Center Colossal Boss Bar */}
              {hud.bossActive && (
                <div className="hidden sm:flex flex-col items-center rounded-xl bg-slate-950/85 px-5 py-2 border border-rose-500/40 min-w-[280px]">
                  <div className="flex w-full items-center justify-between text-xs font-bold text-rose-300">
                    <span>{hud.bossName}</span>
                    <span className="font-mono-num">Phase {hud.bossPhase}</span>
                  </div>
                  <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-100"
                      style={{ width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Top-Right Gravity Selector & Utility Buttons */}
              <div className="pointer-events-auto flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/75 p-1.5 border border-white/10">
                  {GRAVITY_ORDER.map((preset) => {
                    const info = GRAVITY_PRESETS[preset];
                    const active = hud.gravityPreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => engineRef.current?.setGravityPreset(preset)}
                        className={`rounded-lg px-2 py-1 font-mono-num text-[11px] font-bold transition-colors ${
                          active
                            ? 'bg-white text-slate-950'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {info.shortLabel}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="pointer-events-none rounded-lg bg-slate-950/75 px-2.5 py-1 text-[11px] font-semibold text-pink-300 border border-white/10">
                    {WEAPONS[hud.weapon].name} · Combo {hud.comboStep}/3
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTouchPad((v) => !v)}
                    aria-label="Toggle Touch Controls"
                    className={`rounded-lg border p-2 text-xs ${
                      showTouchPad
                        ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                        : 'border-white/15 bg-slate-950/75 text-slate-300'
                    }`}
                  >
                    <Gamepad2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.toggleMuteAll();
                      setSfxOn(gameAudio.sfxEnabled);
                      setMusicOn(gameAudio.musicEnabled);
                    }}
                    aria-label="Mute or Unmute Audio"
                    className="rounded-lg border border-white/15 bg-slate-950/75 p-2 text-slate-200 hover:bg-slate-800"
                  >
                    {sfxOn || musicOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-rose-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (screen === 'PLAYING') {
                        engineRef.current?.setPaused(true);
                        setScreen('PAUSED');
                      } else if (screen === 'PAUSED') {
                        engineRef.current?.setPaused(false);
                        setScreen('PLAYING');
                      }
                    }}
                    aria-label="Pause Game"
                    className="rounded-lg border border-white/15 bg-slate-950/75 p-2 text-slate-200 hover:bg-slate-800"
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Boss Bar */}
          {hud?.bossActive && (
            <div className="pointer-events-none fixed inset-x-4 top-24 z-20 sm:hidden rounded-lg bg-slate-950/85 px-3 py-1.5 border border-rose-500/40">
              <div className="flex justify-between text-[11px] font-bold text-rose-300">
                <span>{hud.bossName}</span>
                <span>Phase {hud.bossPhase}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Touch Controls */}
          {showTouchPad && screen === 'PLAYING' && hud && (
            <TouchControls
              onMoveChange={(dir) => engineRef.current?.setTouchMoveX(dir)}
              onAction={(act) => engineRef.current?.triggerTouchAction(act)}
              gravityPreset={hud.gravityPreset}
              equippedSkill={hud.equippedSkill}
              skillCooldown={hud.skillCooldown}
            />
          )}
        </div>
      )}

      {/* ==================== PAUSE MODAL ==================== */}
      {screen === 'PAUSED' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0D1326] p-6 text-slate-100 shadow-2xl space-y-4">
            <h2 className="font-display text-2xl font-bold text-white">Game Paused</h2>
            <p className="text-xs text-slate-400">
              {ZONES[selectedZone].name} · {ZONES[selectedZone].subtitle}
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={toggleInfiniteLife}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${
                  profile.infiniteLife
                    ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700 bg-slate-900 text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <InfinityIcon className="h-4 w-4" /> Infinite Life Mode
                </span>
                <span>{profile.infiniteLife ? 'ON' : 'OFF'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleSfx}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold"
                >
                  Sound FX: {sfxOn ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={toggleMusic}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold"
                >
                  Music: {musicOn ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.setPaused(false);
                  setScreen('PLAYING');
                }}
                className="w-full rounded-xl bg-pink-600 py-3 text-sm font-bold text-white hover:bg-pink-500"
              >
                Resume Run
              </button>
              <button
                type="button"
                onClick={() => startZoneRun(selectedZone)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Restart Zone
              </button>
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.destroy();
                  engineRef.current = null;
                  setScreen('TITLE');
                }}
                className="w-full rounded-xl border border-slate-800 py-2.5 text-sm font-semibold text-slate-400 hover:text-white"
              >
                Return to Title
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STAGE CLEAR / GAME OVER MODAL ==================== */}
      {(screen === 'STAGE_CLEAR' || screen === 'GAME_OVER') && runSummary && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0D1326] p-6 text-slate-100 shadow-2xl space-y-5">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-white">
                {screen === 'STAGE_CLEAR'
                  ? `Zone ${runSummary.hud.zoneId} Cleared!`
                  : 'Run Ended'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {ZONES[runSummary.hud.zoneId].name} · Master Boss: {ZONES[runSummary.hud.zoneId].bossName}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
              <div>
                <div className="text-[11px] text-slate-400">Final Score</div>
                <div className="font-mono-num text-lg font-bold text-sky-300">
                  {runSummary.hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Coins Earned</div>
                <div className="font-mono-num text-lg font-bold text-amber-400">
                  +{runSummary.hud.runCoins}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Prism Shards</div>
                <div className="font-mono-num text-lg font-bold text-pink-400">
                  +{runSummary.shardsEarned}
                </div>
              </div>
            </div>

            {runSummary.newlyUnlockedSkill && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                  <Sparkles className="h-4 w-4" />
                  Special Skill Unlocked: {SPECIAL_SKILLS[runSummary.newlyUnlockedSkill].name}
                </div>
                <p className="mt-1 text-xs text-emerald-100/80">
                  {SPECIAL_SKILLS[runSummary.newlyUnlockedSkill].description}
                </p>
              </div>
            )}

            {friendChallenge && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                {runSummary.hud.score >= friendChallenge.targetScore
                  ? `Victory! You beat ${friendChallenge.playerName}'s score of ${friendChallenge.targetScore.toLocaleString()}!`
                  : `Target to beat ${friendChallenge.playerName}: ${friendChallenge.targetScore.toLocaleString()}`}
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 pt-1">
              {screen === 'STAGE_CLEAR' && runSummary.hud.zoneId < 5 && (
                <button
                  type="button"
                  onClick={() => startZoneRun((runSummary.hud.zoneId + 1) as ZoneId)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-sm font-bold text-white hover:bg-pink-500"
                >
                  <Swords className="h-4 w-4" />
                  Next Zone ({runSummary.hud.zoneId + 1})
                </button>
              )}

              <button
                type="button"
                onClick={() => startZoneRun(runSummary.hud.zoneId)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
                Play Again
              </button>

              <button
                type="button"
                onClick={handleOpenLeaderboard}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>

              <button
                type="button"
                onClick={() => {
                  engineRef.current?.destroy();
                  engineRef.current = null;
                  setScreen('TITLE');
                }}
                className="w-full rounded-xl border border-slate-800 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Back to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== META MODALS ==================== */}
      {activeModal === 'wardrobe' && (
        <WardrobeModal
          profile={profile}
          onClose={() => setActiveModal(null)}
          onUpdateProfile={updateProfile}
        />
      )}
      {activeModal === 'daily' && (
        <DailyModal
          profile={profile}
          onClose={() => setActiveModal(null)}
          onClaimDailyLogin={handleClaimDailyLogin}
        />
      )}
      {activeModal === 'leaderboard' && (
        <LeaderboardModal
          entries={leaderboard}
          profile={profile}
          selectedZone={selectedZone}
          isOnline={isOnline}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'studio' && (
        <CreatorDonateFeedbackModal
          initialTab={studioTab}
          playerName={profile.displayName}
          userId={user?.uid || null}
          isOnline={isOnline}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
