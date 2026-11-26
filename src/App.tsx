import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  Flame,
  Gamepad2,
  Gift,
  Heart,
  Infinity as InfinityIcon,
  Lock,
  Maximize2,
  Minimize2,
  Music,
  Pause,
  Play,
  Power,
  RotateCcw,
  RotateCw,
  Settings,
  Share2,
  Shirt,
  Sparkles,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { AvatarPreviewCanvas } from './components/AvatarPreviewCanvas';
import {
  CreatorDonateFeedbackModal,
  StudioTab,
} from './components/CreatorDonateFeedbackModal';
import { DailyModal, LeaderboardModal, WardrobeModal } from './components/MetaModals';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SettingsModal } from './components/SettingsModal';
import { TouchControls } from './components/TouchControls';
import { gameAudio } from './game/audio';
import {
  CHARACTER_REFERENCE_IMAGE,
  DAILY_LOGIN_REWARDS,
  getDailyChallengesForDate,
  getTodayDateKey,
  getZoneConfig,
  GRAVITY_ORDER,
  GRAVITY_PRESETS,
  MAX_ZONE,
  SPECIAL_SKILLS,
  WEAPON_ORDER,
  WEAPONS,
} from './game/catalog';
import { GravityPlatformerEngine } from './game/engine';
import {
  ChallengeTarget,
  GameScreenState,
  HudSnapshot,
  LeaderboardEntry,
  PlayerProfile,
  SkillId,
  WeaponId,
  ZoneId,
} from './game/types';
import { drawZoneBackground } from './game/zoneRenderer';
import {
  loadCachedLeaderboard,
  loadLocalProfile,
  saveLocalProfile,
  submitLocalLeaderboardScore,
} from './services/syncService';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadLocalProfile());
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [screen, setScreen] = useState<GameScreenState>('TITLE');
  const [selectedZone, setSelectedZone] = useState<ZoneId>(() =>
    Math.min(MAX_ZONE, loadLocalProfile().unlockedZone)
  );
  const [zoneChapter, setZoneChapter] = useState<number>(() =>
    Math.floor((Math.min(MAX_ZONE, loadLocalProfile().unlockedZone) - 1) / 10)
  );
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [runSummary, setRunSummary] = useState<{
    hud: HudSnapshot;
    newlyUnlockedSkill: SkillId | null;
    newlyUnlockedSuperWeapon: WeaponId | null;
    completedChallenges: string[];
    shardsEarned: number;
    lifeCreditsAwarded: number;
  } | null>(null);

  const [activeModal, setActiveModal] = useState<
    'wardrobe' | 'daily' | 'leaderboard' | 'studio' | 'settings' | null
  >(null);
  const [studioTab, setStudioTab] = useState<StudioTab>('creator');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    loadCachedLeaderboard()
  );
  const [showTouchPad, setShowTouchPad] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  const [sfxOn, setSfxOn] = useState(gameAudio.sfxEnabled);
  const [musicOn, setMusicOn] = useState(gameAudio.musicEnabled);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth && window.innerWidth < 768;
  });
  const [portraitDismissed, setPortraitDismissed] = useState(false);

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
      zoneId: zone >= 1 && zone <= MAX_ZONE ? zone : 1,
      weapon: WEAPONS[weapon] ? weapon : 'sword',
    };
  }, []);

  // Offline-first profile persistence
  const updateProfile = useCallback((next: PlayerProfile) => {
    setProfile(next);
    saveLocalProfile(next);
    engineRef.current?.updateProfile(next);
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Animated Title Screen Background matching currently selected Zone
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

  // Clean Exit Game Handler (Native Android App.exitApp + Browser EXITED state)
  const handleExitApp = useCallback(async () => {
    gameAudio.playUiClick();
    gameAudio.stopMusic();
    engineRef.current?.destroy();
    engineRef.current = null;
    setActiveModal(null);
    setScreen('EXITED');

    try {
      if (Capacitor.isNativePlatform()) {
        await CapacitorApp.exitApp();
      } else {
        window.close();
      }
    } catch {
      // Browser frames block window.close(); EXITED screen handles exit gracefully
    }
  }, []);

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

      const zoneCfg = getZoneConfig(summaryHud.zoneId);
      let newlyUnlockedSkill: SkillId | null = null;
      const nextSkills = [...profile.unlockedSkills];
      if (victory && !nextSkills.includes(zoneCfg.rewardSkill)) {
        nextSkills.push(zoneCfg.rewardSkill);
        newlyUnlockedSkill = zoneCfg.rewardSkill;
      }

      const nextUnlockedZone = victory
        ? Math.max(profile.unlockedZone, Math.min(MAX_ZONE, summaryHud.zoneId + 1))
        : profile.unlockedZone;

      // Check if advancing to this next zone unlocks one of the 5 Super Weapons (Zones 5, 10, 15, 20, 25)
      let newlyUnlockedSuperWeapon: WeaponId | null = null;
      if (victory && nextUnlockedZone > profile.unlockedZone) {
        for (const wId of WEAPON_ORDER) {
          const w = WEAPONS[wId];
          if (w.isSuper && w.unlockZone > profile.unlockedZone && w.unlockZone <= nextUnlockedZone) {
            newlyUnlockedSuperWeapon = wId;
            break;
          }
        }
      }

      // Award Life Credits per zone cleared when Infinite Life is OFF (+2 on every 5th zone, +1 otherwise)
      const lifeCreditsAwarded =
        victory && !profile.infiniteLife ? (summaryHud.zoneId % 5 === 0 ? 2 : 1) : 0;

      const nextLifeCredits = profile.infiniteLife
        ? profile.lifeCredits
        : victory
        ? Math.min(99, Math.max(1, summaryHud.lives) + lifeCreditsAwarded)
        : 3;

      const nextProfile: PlayerProfile = {
        ...profile,
        starCoins: profile.starCoins + summaryHud.runCoins,
        challengeCurrency: profile.challengeCurrency + shardsEarned,
        lifeCredits: nextLifeCredits,
        unlockedZone: nextUnlockedZone,
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
        newlyUnlockedSuperWeapon,
        completedChallenges: newlyCompleted,
        shardsEarned,
        lifeCreditsAwarded,
      });

      const updatedBoard = submitLocalLeaderboardScore({
        playerName: nextProfile.displayName,
        score: summaryHud.score,
        zoneReached: summaryHud.zoneId,
        weapon: summaryHud.weapon,
        outfitId: nextProfile.equippedOutfit,
        difficultyPeak: summaryHud.difficultyMultiplier,
      });
      setLeaderboard(updatedBoard);

      setScreen(victory ? 'STAGE_CLEAR' : 'GAME_OVER');
    },
    [profile, updateProfile]
  );

  // Start a Run
  const startZoneRun = useCallback(
    (zoneId: ZoneId) => {
      if (zoneId > profile.unlockedZone) return;
      gameAudio.unlock();
      gameAudio.playUiClick();
      setSelectedZone(zoneId);
      setZoneChapter(Math.floor((zoneId - 1) / 10));
      setRunSummary(null);
      setScreen('PLAYING');

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

  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  // Enter starts game from Title Screen
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

  const handleOpenLeaderboard = () => {
    gameAudio.playUiClick();
    setLeaderboard(loadCachedLeaderboard());
    setActiveModal('leaderboard');
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

  useEffect(() => {
    const syncOrientationAndFs = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 768;
      setIsPortraitMobile(portrait);
      if (!portrait) {
        setPortraitDismissed(false);
      }
    };
    syncOrientationAndFs();
    window.addEventListener('resize', syncOrientationAndFs);
    window.addEventListener('orientationchange', syncOrientationAndFs);
    document.addEventListener('fullscreenchange', syncOrientationAndFs);
    return () => {
      window.removeEventListener('resize', syncOrientationAndFs);
      window.removeEventListener('orientationchange', syncOrientationAndFs);
      document.removeEventListener('fullscreenchange', syncOrientationAndFs);
    };
  }, []);

  const toggleLandscapeFullscreen = useCallback(async () => {
    gameAudio.playUiClick();
    const orientationApi = window.screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
      unlock?: () => void;
    };
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        await orientationApi?.lock?.('landscape').catch(() => {});
      } else {
        orientationApi?.unlock?.();
        await document.exitFullscreen?.();
      }
    } catch {
      // Fullscreen/orientation lock can be blocked inside embedded frames
    }
  }, []);

  const todayChallenges = useMemo(() => getDailyChallengesForDate(getTodayDateKey()), []);
  const dailyAvailable = profile.lastDailyClaimDate !== getTodayDateKey();
  const selectedZoneCfg = useMemo(() => getZoneConfig(selectedZone), [selectedZone]);
  const activePortraitSrc = profile.customPhotoDataUrl || CHARACTER_REFERENCE_IMAGE;

  const chapterStart = zoneChapter * 10 + 1;
  const chapterZones = useMemo(
    () => Array.from({ length: 10 }, (_, idx) => chapterStart + idx).filter((z) => z <= MAX_ZONE),
    [chapterStart]
  );

  // ==================== EXITED SCREEN ====================
  if (screen === 'EXITED') {
    return (
      <div className="flex h-[100dvh] w-[100dvw] items-center justify-center bg-[#070B19] p-6 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0D1326] p-7 text-center shadow-2xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-pink-400">
            <img
              src={activePortraitSrc}
              alt={profile.displayName}
              className="h-full w-full object-cover object-top"
            />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white">
              Arya&apos;s Infinite Odyssey
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Game session closed safely. All progress, super weapons, life credits, and custom photo settings are saved offline.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                gameAudio.playUiClick();
                setScreen('TITLE');
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-sm font-bold text-white hover:bg-pink-500"
            >
              <Play className="h-4 w-4 fill-current" />
              Relaunch Game
            </button>
            <button
              type="button"
              onClick={() => handleExitApp()}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 hover:text-white"
            >
              <Power className="h-4 w-4" />
              Close App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-[100dvw] overflow-hidden bg-[#070B19] text-slate-100">
      {/* ==================== TITLE SCREEN ==================== */}
      {screen === 'TITLE' && (
        <div className="relative flex h-full w-full flex-col justify-between overflow-y-auto">
          <canvas
            ref={titleBgCanvasRef}
            className="pointer-events-none fixed inset-0 h-full w-full opacity-90"
          />
          <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/45 to-slate-950/90" />

          {/* Top Compact Utility Strip */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-4 pt-2.5 sm:px-8 sm:pt-4 safe-area-hud">
            <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-300">
              <span className="font-semibold text-emerald-300">Offline Odyssey</span>
              <span aria-hidden="true">·</span>
              <span>
                Unlocked: <strong className="font-mono-num text-sky-300">{profile.unlockedZone}/{MAX_ZONE}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Lives:{' '}
                <strong className="font-mono-num text-rose-300">
                  {profile.infiniteLife ? '∞' : `♥ ×${profile.lifeCredits}`}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Shards: <strong className="font-mono-num text-pink-400">{profile.challengeCurrency}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Coins: <strong className="font-mono-num text-amber-400">{profile.starCoins}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <PWAInstallButton />
              <button
                type="button"
                onClick={toggleLandscapeFullscreen}
                aria-label="Toggle Landscape HD Fullscreen"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span className="hidden md:inline">{isFullscreen ? 'Exit Full' : 'HD Fullscreen'}</span>
              </button>
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
                {musicOn ? 'Music' : 'Muted'}
              </button>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playUiClick();
                  setActiveModal('settings');
                }}
                aria-label="Open Settings & Photo Upload"
                className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-slate-900/85 px-2.5 py-1.5 text-xs font-semibold text-sky-200 hover:bg-slate-800"
              >
                <Settings className="h-3.5 w-3.5 text-sky-400" />
                Settings
              </button>
              <button
                type="button"
                onClick={handleExitApp}
                aria-label="Exit Game"
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/50 px-2.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-900/60"
              >
                <Power className="h-3.5 w-3.5" />
                Exit
              </button>
            </div>
          </div>

          {/* Main Hero Staging */}
          <div className="relative z-10 mx-auto my-auto grid w-full max-w-6xl items-center gap-3 sm:gap-5 px-4 py-2 sm:grid-cols-[1.32fr_0.78fr] sm:px-8 sm:py-3">
            <div className="space-y-2.5 sm:space-y-3">
              {friendChallenge && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                  Challenge from <strong>{friendChallenge.playerName}</strong> · Beat{' '}
                  <strong className="font-mono-num">{friendChallenge.targetScore.toLocaleString()}</strong> in Zone{' '}
                  {friendChallenge.zoneId}
                </div>
              )}

              {/* Bespoke Title Lockup */}
              <div>
                <svg viewBox="0 0 680 94" className="h-9 w-auto max-w-full sm:h-12 lg:h-16" role="img" aria-label="Arya's Infinite Odyssey">
                  <defs>
                    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F8FAFC" />
                      <stop offset="48%" stopColor="#F472B6" />
                      <stop offset="100%" stopColor="#38BDF8" />
                    </linearGradient>
                  </defs>
                  <text
                    x="0"
                    y="58"
                    fill="url(#titleGrad)"
                    fontFamily="Outfit, sans-serif"
                    fontWeight="800"
                    fontSize="50"
                    letterSpacing="-1.2"
                  >
                    ARYA&apos;S INFINITE ODYSSEY
                  </text>
                  <text
                    x="2"
                    y="84"
                    fill="#94A3B8"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight="600"
                    fontSize="14.5"
                    letterSpacing="3"
                  >
                    100 ZONES · 5 SUPER WEAPONS · SKY RUNNER EDITION
                  </text>
                </svg>
              </div>

              {/* 100-Zone Chaptered Selector */}
              <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-2.5 sm:p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-white">
                    Select Zone ({profile.unlockedZone}/{MAX_ZONE} Unlocked)
                  </span>
                  <span className="text-slate-300">
                    Tier {selectedZoneCfg.tier + 1} · {selectedZoneCfg.speedScale.toFixed(2)}x Speed · {selectedZoneCfg.biomeLabel}
                  </span>
                </div>

                {/* 10 Chapter Tabs (Zones 1-10 ... 91-100) */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {Array.from({ length: 10 }, (_, ch) => {
                    const from = ch * 10 + 1;
                    const to = from + 9;
                    const active = zoneChapter === ch;
                    const chapterUnlocked = profile.unlockedZone >= from;
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => {
                          gameAudio.playUiClick();
                          setZoneChapter(ch);
                        }}
                        className={`shrink-0 rounded-md px-2 py-1 font-mono-num text-[10px] font-bold transition-colors ${
                          active
                            ? 'bg-pink-600 text-white'
                            : chapterUnlocked
                            ? 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                            : 'bg-slate-950 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {from}-{to}
                      </button>
                    );
                  })}
                </div>

                {/* 10 Zones in Active Chapter */}
                <div className="grid grid-cols-5 gap-1.5">
                  {chapterZones.map((zId) => {
                    const z = getZoneConfig(zId);
                    const unlocked = zId <= profile.unlockedZone;
                    const active = selectedZone === zId;
                    const isMilestone = zId % 5 === 0;
                    const cleared = zId < profile.unlockedZone;

                    return (
                      <button
                        key={zId}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          gameAudio.playUiClick();
                          setSelectedZone(zId);
                        }}
                        title={
                          unlocked
                            ? `${z.name} · ${z.mutatorTitle}`
                            : `Clear Zone ${zId - 1} to unlock Zone ${zId}`
                        }
                        className={`rounded-lg border px-2 py-1.5 text-left transition-colors ${
                          active
                            ? 'border-pink-400 bg-slate-900'
                            : unlocked
                            ? 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                            : 'border-slate-900 bg-slate-950/60 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span style={{ color: unlocked ? z.accentColor : '#64748B' }}>
                            Z{zId}
                          </span>
                          {!unlocked ? (
                            <Lock className="h-3 w-3 text-slate-500" />
                          ) : isMilestone ? (
                            <Zap className="h-3 w-3 text-amber-400" />
                          ) : cleared ? (
                            <Sparkles className="h-3 w-3 text-emerald-400" />
                          ) : null}
                        </div>
                        <div className="truncate text-[10px] font-medium text-slate-200">
                          {z.name.split(' ')[0]}
                        </div>
                        <div className="truncate text-[9px] text-slate-400">
                          {isMilestone ? '5-Zone Surge' : `T${z.tier + 1} · ${z.speedScale.toFixed(1)}x`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Starter Weapons + 5 Unlockable Super Weapons */}
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-amber-400" />
                    Weapons & 5 Super Guns (Unlock every 5 Zones)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {WEAPONS[profile.equippedWeapon].comboNames.join(' → ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {WEAPON_ORDER.map((wId) => {
                    const w = WEAPONS[wId];
                    const unlocked = !w.isSuper || profile.unlockedZone >= w.unlockZone;
                    const active = profile.equippedWeapon === wId;
                    return (
                      <button
                        key={wId}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          gameAudio.playUiClick();
                          updateProfile({ ...profile, equippedWeapon: wId });
                        }}
                        title={
                          unlocked
                            ? w.description
                            : `Advance to Zone ${w.unlockZone} to activate ${w.name}`
                        }
                        className={`rounded-xl border px-2.5 py-2 text-left transition-colors ${
                          active
                            ? 'border-sky-400 bg-slate-900/95'
                            : unlocked
                            ? 'border-slate-800 bg-slate-950/80 hover:border-slate-600'
                            : 'border-slate-900 bg-slate-950/50 opacity-55 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className="truncate text-[11px] font-bold"
                            style={{ color: unlocked ? (w.isSuper ? w.color : '#FFFFFF') : '#94A3B8' }}
                          >
                            {w.name}
                          </span>
                          {!unlocked && <Lock className="h-3 w-3 shrink-0 text-slate-500" />}
                        </div>
                        <div className="truncate text-[10px] text-slate-400">
                          {unlocked ? w.subtitle : `Reach Zone ${w.unlockZone}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary CTA + Infinite Life Toggle + Meta Actions */}
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => startZoneRun(selectedZone)}
                  className="flex items-center gap-2 rounded-xl bg-pink-600 px-5 py-3 font-display text-sm sm:text-base font-bold text-white shadow-lg shadow-pink-600/25 hover:bg-pink-500 transition-colors"
                >
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                  Launch Zone {selectedZone}
                </button>

                <button
                  type="button"
                  onClick={toggleInfiniteLife}
                  className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-xs font-bold transition-colors ${
                    profile.infiniteLife
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <InfinityIcon className="h-4 w-4" />
                  Infinite Life: {profile.infiniteLife ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playUiClick();
                    setActiveModal('wardrobe');
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Shirt className="h-3.5 w-3.5 text-pink-400" />
                  Wardrobe & Skills
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playUiClick();
                    setActiveModal('daily');
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Gift className="h-3.5 w-3.5 text-amber-400" />
                  {dailyAvailable ? 'Claim Daily Reward' : `Daily (${todayChallenges.length})`}
                </button>

                <button
                  type="button"
                  onClick={handleOpenLeaderboard}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Trophy className="h-3.5 w-3.5 text-sky-400" />
                  Hall of Fame
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playUiClick();
                    setStudioTab('creator');
                    setActiveModal('studio');
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                  JMC Labs
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playUiClick();
                    setStudioTab('donate');
                    setActiveModal('studio');
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-pink-500/40 bg-pink-500/15 px-3 py-1.5 text-xs font-semibold text-pink-200 hover:bg-pink-500/25"
                >
                  <Heart className="h-3.5 w-3.5 text-pink-400" />
                  Donate
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playUiClick();
                    setStudioTab('feedback');
                    setActiveModal('studio');
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
                >
                  Comments
                </button>
              </div>
            </div>

            {/* Right Showcase Card: Sky Runner Portrait + Live Customized Sprite */}
            <div className="rounded-2xl border border-slate-800/90 bg-slate-950/75 p-3 sm:p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-bold text-white">{profile.displayName}</span>
                <span>
                  Best: <strong className="font-mono-num text-sky-300">{profile.highScore.toLocaleString()}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 items-center gap-3">
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                  <img
                    src={activePortraitSrc}
                    alt={profile.displayName}
                    referrerPolicy="no-referrer"
                    className="h-28 sm:h-36 lg:h-40 w-full object-cover object-top"
                  />
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 py-1.5 sm:py-2">
                  <AvatarPreviewCanvas profile={profile} size={114} />
                  <span className="text-[10px] font-medium text-slate-400">
                    {profile.customPhotoDataUrl ? 'Custom Photo Hero' : 'Sky Runner Avatar'}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 border-t border-slate-800 pt-2 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-white">
                  Zone {selectedZoneCfg.id}: {selectedZoneCfg.name}
                </div>
                <div className="text-[11px] text-amber-300 font-medium">
                  {selectedZoneCfg.mutatorTitle} · Boss: {selectedZoneCfg.bossName}
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedZoneCfg.defaultGravityHint}
                </div>
              </div>
            </div>
          </div>

          {/* Flat Single Control Hint Line */}
          <div className="relative z-10 px-4 pb-2 text-center text-[10px] sm:text-[11px] text-slate-400">
            AD Move · Space Jump · F Flip -1G · 1-5 / Q-E Gravity · J Attack (Hold for Speed Gun) · R Skill · Find Hidden 10s Power Orbs!
          </div>
        </div>
      )}

      {/* ==================== ACTIVE GAMEPLAY VIEW ==================== */}
      {screen !== 'TITLE' && (
        <div className="relative h-full w-full overflow-hidden">
          <canvas ref={gameCanvasRef} className="block h-full w-full" />

          {/* Unobtrusive Top Perimeter HUD */}
          {hud && (
            <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-2 sm:gap-4 p-2 sm:p-3.5 safe-area-hud">
              {/* Top-Left Status Cluster */}
              <div className="flex flex-col gap-1 sm:gap-1.5 rounded-xl bg-slate-950/75 px-3 py-2 sm:px-3.5 sm:py-2.5 border border-white/10">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {hud.infiniteLife ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-300">
                      <InfinityIcon className="h-4 w-4" />
                      INVINCIBLE
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-rose-400 fill-rose-400" />
                      <div className="h-2.5 w-24 sm:w-28 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-rose-500 transition-all duration-150"
                          style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono-num text-xs font-bold text-white">
                        {hud.hp}/{hud.maxHp}
                      </span>
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-rose-200 border border-rose-400/30">
                        ♥ ×{hud.lives}
                      </span>
                    </div>
                  )}
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-mono-num text-sm font-bold text-sky-300">
                    {hud.score.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                  <span>
                    Z{hud.zoneId}/{MAX_ZONE} · T{hud.zoneTier}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{hud.progressPct}%</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num text-amber-300">
                    Pace {hud.difficultyMultiplier.toFixed(2)}x
                  </span>
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

              {/* Top-Center: 10s Hidden Overdrive Countdown & Colossal Boss Bar */}
              <div className="flex flex-col items-center gap-1.5">
                {hud.hiddenPowerTimer > 0 && (
                  <div className="flex flex-col items-center rounded-xl border border-amber-400/60 bg-amber-950/85 px-4 py-1.5 min-w-[200px] shadow-lg shadow-amber-500/20">
                    <div className="flex w-full items-center justify-between text-[11px] font-extrabold text-amber-200">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-yellow-300" />
                        HIDDEN POWER OVERDRIVE
                      </span>
                      <span className="font-mono-num">{hud.hiddenPowerTimer.toFixed(1)}s</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-400 transition-all duration-75"
                        style={{
                          width: `${Math.max(0, (hud.hiddenPowerTimer / hud.hiddenPowerMax) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

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
              </div>

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
                    {WEAPONS[hud.weapon].name} · {hud.comboStep}/3
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
                    onClick={toggleLandscapeFullscreen}
                    aria-label="Toggle Landscape HD Fullscreen"
                    className="rounded-lg border border-white/15 bg-slate-950/75 p-2 text-slate-200 hover:bg-slate-800"
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
              onAttackHoldChange={(held) => engineRef.current?.setTouchAttackHeld(held)}
              gravityPreset={hud.gravityPreset}
              equippedSkill={hud.equippedSkill}
              skillCooldown={hud.skillCooldown}
              hiddenPowerTimer={hud.hiddenPowerTimer}
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
              {getZoneConfig(selectedZone).name} · {getZoneConfig(selectedZone).subtitle}
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
                className="w-full rounded-xl border border-slate-800 py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
              >
                Return to Title
              </button>
              <button
                type="button"
                onClick={handleExitApp}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-900/50"
              >
                <Power className="h-3.5 w-3.5" />
                Exit Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STAGE CLEAR / GAME OVER MODAL ==================== */}
      {(screen === 'STAGE_CLEAR' || screen === 'GAME_OVER') && runSummary && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0D1326] p-6 text-slate-100 shadow-2xl space-y-4">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-white">
                {screen === 'STAGE_CLEAR'
                  ? `Zone ${runSummary.hud.zoneId} Cleared!`
                  : 'Run Ended'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {getZoneConfig(runSummary.hud.zoneId).name} · Boss:{' '}
                {getZoneConfig(runSummary.hud.zoneId).bossName}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-center">
              <div>
                <div className="text-[10px] text-slate-400">Final Score</div>
                <div className="font-mono-num text-base font-bold text-sky-300">
                  {runSummary.hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Coins Earned</div>
                <div className="font-mono-num text-base font-bold text-amber-400">
                  +{runSummary.hud.runCoins}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Prism Shards</div>
                <div className="font-mono-num text-base font-bold text-pink-400">
                  +{runSummary.shardsEarned}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Life Credits</div>
                <div className="font-mono-num text-base font-bold text-rose-300">
                  {profile.infiniteLife
                    ? '∞'
                    : runSummary.lifeCreditsAwarded > 0
                    ? `+${runSummary.lifeCreditsAwarded} ♥`
                    : `♥ ×${profile.lifeCredits}`}
                </div>
              </div>
            </div>

            {runSummary.newlyUnlockedSuperWeapon && (
              <div className="rounded-xl border border-amber-400/50 bg-amber-500/15 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                    <Flame className="h-4 w-4" />
                    Super Gun Activated: {WEAPONS[runSummary.newlyUnlockedSuperWeapon].name}!
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playRewardChime();
                      updateProfile({
                        ...profile,
                        equippedWeapon: runSummary.newlyUnlockedSuperWeapon!,
                      });
                    }}
                    className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
                  >
                    {profile.equippedWeapon === runSummary.newlyUnlockedSuperWeapon
                      ? 'Equipped'
                      : 'Equip Now'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-amber-100/85">
                  {WEAPONS[runSummary.newlyUnlockedSuperWeapon].description}
                </p>
              </div>
            )}

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
              {screen === 'STAGE_CLEAR' && runSummary.hud.zoneId < MAX_ZONE && (
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

              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={() => {
                    engineRef.current?.destroy();
                    engineRef.current = null;
                    setScreen('TITLE');
                  }}
                  className="flex-1 rounded-xl border border-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Back to Title Screen
                </button>
                <button
                  type="button"
                  onClick={handleExitApp}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/35 px-4 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-900/50"
                >
                  <Power className="h-3.5 w-3.5" />
                  Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== META & SETTINGS MODALS ==================== */}
      {activeModal === 'settings' && (
        <SettingsModal
          profile={profile}
          sfxOn={sfxOn}
          musicOn={musicOn}
          showTouchPad={showTouchPad}
          isFullscreen={isFullscreen}
          onToggleSfx={toggleSfx}
          onToggleMusic={toggleMusic}
          onToggleTouchPad={() => {
            gameAudio.playUiClick();
            setShowTouchPad((v) => !v);
          }}
          onToggleFullscreen={toggleLandscapeFullscreen}
          onUpdateProfile={updateProfile}
          onExitGame={handleExitApp}
          onClose={() => setActiveModal(null)}
        />
      )}
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
          userId={null}
          isOnline={isOnline}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Portrait Mobile Rotate Prompt for Landscape HD */}
      {isPortraitMobile && !portraitDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6 text-center">
          <div className="w-full max-w-sm rounded-2xl border border-sky-500/40 bg-[#0D1326] p-6 shadow-2xl space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
              <RotateCw className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-bold text-white">
              Rotate to Landscape HD Mode
            </h2>
            <p className="text-xs leading-relaxed text-slate-300">
              Arya&apos;s Infinite Odyssey is tuned for widescreen landscape play on mobile phones and tablets so all 100 gravity zones and colossal bosses fit cleanly.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={toggleLandscapeFullscreen}
                className="w-full rounded-xl bg-sky-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-sky-400"
              >
                Enter Landscape Fullscreen
              </button>
              <button
                type="button"
                onClick={() => setPortraitDismissed(true)}
                className="w-full rounded-xl border border-slate-700 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
