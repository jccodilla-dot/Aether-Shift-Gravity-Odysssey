import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { createDefaultProfile } from '../game/catalog';
import { LeaderboardEntry, PlayerProfile, SkillId } from '../game/types';
import { db, handleFirestoreError, OperationType } from './firebase';

const LOCAL_PROFILE_KEY = 'aethershift_profile_v1';
const LOCAL_LEADERBOARD_KEY = 'aethershift_leaderboard_cache_v1';
const PENDING_SYNC_KEY = 'aethershift_pending_sync_v1';

export function loadLocalProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
      return { ...createDefaultProfile(), ...parsed };
    }
  } catch {
    // ignore storage errors
  }
  return createDefaultProfile();
}

export function saveLocalProfile(profile: PlayerProfile) {
  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage errors
  }
}

export function markPendingSync(pending: boolean) {
  try {
    localStorage.setItem(PENDING_SYNC_KEY, pending ? '1' : '0');
  } catch {}
}

export function hasPendingSync(): boolean {
  try {
    return localStorage.getItem(PENDING_SYNC_KEY) === '1';
  } catch {
    return false;
  }
}

function sanitizeDisplayName(name: string): string {
  const cleaned = (name || 'Sky Runner').trim().slice(0, 48);
  return cleaned.length > 0 ? cleaned : 'Sky Runner';
}

function sanitizeProfilePayload(profile: PlayerProfile, uid: string) {
  return {
    uid,
    displayName: sanitizeDisplayName(profile.displayName),
    challengeCurrency: Math.max(0, Math.min(10000000, Math.floor(profile.challengeCurrency))),
    starCoins: Math.max(0, Math.min(10000000, Math.floor(profile.starCoins))),
    unlockedZone: Math.max(1, Math.min(5, Math.floor(profile.unlockedZone))),
    unlockedSkills: Array.from(new Set(profile.unlockedSkills)).slice(0, 10),
    unlockedCosmetics: Array.from(new Set(profile.unlockedCosmetics)).slice(0, 40),
    equippedWeapon: profile.equippedWeapon,
    equippedOutfit: profile.equippedOutfit.slice(0, 48),
    equippedGlasses: profile.equippedGlasses.slice(0, 48),
    equippedHair: profile.equippedHair.slice(0, 48),
    equippedAura: profile.equippedAura.slice(0, 48),
    vitalityLevel: Math.max(1, Math.min(10, Math.floor(profile.vitalityLevel))),
    powerLevel: Math.max(1, Math.min(10, Math.floor(profile.powerLevel))),
    gravMasteryLevel: Math.max(1, Math.min(10, Math.floor(profile.gravMasteryLevel))),
    dailyStreak: Math.max(0, Math.min(3650, Math.floor(profile.dailyStreak))),
    lastDailyClaimDate: (profile.lastDailyClaimDate || '').slice(0, 16),
    completedDailyChallenges: Array.from(new Set(profile.completedDailyChallenges)).slice(0, 30),
    highScore: Math.max(0, Math.min(999999999, Math.floor(profile.highScore))),
    infiniteLife: Boolean(profile.infiniteLife),
  };
}

export function mergeProfiles(local: PlayerProfile, cloud: PlayerProfile): PlayerProfile {
  return {
    ...cloud,
    uid: cloud.uid,
    displayName: cloud.displayName || local.displayName,
    challengeCurrency: Math.max(local.challengeCurrency, cloud.challengeCurrency),
    starCoins: Math.max(local.starCoins, cloud.starCoins),
    unlockedZone: Math.max(local.unlockedZone, cloud.unlockedZone),
    unlockedSkills: Array.from(new Set([...cloud.unlockedSkills, ...local.unlockedSkills])) as SkillId[],
    unlockedCosmetics: Array.from(new Set([...cloud.unlockedCosmetics, ...local.unlockedCosmetics])),
    vitalityLevel: Math.max(local.vitalityLevel, cloud.vitalityLevel),
    powerLevel: Math.max(local.powerLevel, cloud.powerLevel),
    gravMasteryLevel: Math.max(local.gravMasteryLevel, cloud.gravMasteryLevel),
    dailyStreak: Math.max(local.dailyStreak, cloud.dailyStreak),
    lastDailyClaimDate:
      local.lastDailyClaimDate > cloud.lastDailyClaimDate
        ? local.lastDailyClaimDate
        : cloud.lastDailyClaimDate,
    completedDailyChallenges: Array.from(
      new Set([...cloud.completedDailyChallenges, ...local.completedDailyChallenges])
    ).slice(-30),
    highScore: Math.max(local.highScore, cloud.highScore),
    equippedWeapon: local.equippedWeapon || cloud.equippedWeapon,
    equippedOutfit: local.equippedOutfit || cloud.equippedOutfit,
    equippedGlasses: local.equippedGlasses || cloud.equippedGlasses,
    equippedHair: local.equippedHair || cloud.equippedHair,
    equippedAura: local.equippedAura || cloud.equippedAura,
    infiniteLife: local.infiniteLife,
  };
}

export async function syncProfileWithCloud(
  uid: string,
  localProfile: PlayerProfile,
  authDisplayName?: string | null
): Promise<PlayerProfile> {
  const path = `players/${uid}`;
  const ref = doc(db, 'players', uid);

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!snap.exists()) {
    const initial: PlayerProfile = {
      ...localProfile,
      uid,
      displayName: sanitizeDisplayName(authDisplayName || localProfile.displayName),
    };
    const payload = sanitizeProfilePayload(initial, uid);
    try {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    saveLocalProfile(initial);
    markPendingSync(false);
    return initial;
  }

  const cloudData = snap.data() as PlayerProfile;
  const merged = mergeProfiles(localProfile, { ...cloudData, uid });
  const payload = sanitizeProfilePayload(merged, uid);

  try {
    await updateDoc(ref, {
      displayName: payload.displayName,
      challengeCurrency: payload.challengeCurrency,
      starCoins: payload.starCoins,
      unlockedZone: payload.unlockedZone,
      unlockedSkills: payload.unlockedSkills,
      unlockedCosmetics: payload.unlockedCosmetics,
      equippedWeapon: payload.equippedWeapon,
      equippedOutfit: payload.equippedOutfit,
      equippedGlasses: payload.equippedGlasses,
      equippedHair: payload.equippedHair,
      equippedAura: payload.equippedAura,
      vitalityLevel: payload.vitalityLevel,
      powerLevel: payload.powerLevel,
      gravMasteryLevel: payload.gravMasteryLevel,
      dailyStreak: payload.dailyStreak,
      lastDailyClaimDate: payload.lastDailyClaimDate,
      completedDailyChallenges: payload.completedDailyChallenges,
      highScore: payload.highScore,
      infiniteLife: payload.infiniteLife,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  saveLocalProfile(merged);
  markPendingSync(false);
  return merged;
}

export async function pushProfileToCloud(uid: string, profile: PlayerProfile): Promise<void> {
  if (!navigator.onLine) {
    markPendingSync(true);
    return;
  }
  const path = `players/${uid}`;
  const ref = doc(db, 'players', uid);
  const payload = sanitizeProfilePayload(profile, uid);

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: payload.displayName,
        challengeCurrency: payload.challengeCurrency,
        starCoins: payload.starCoins,
        unlockedZone: payload.unlockedZone,
        unlockedSkills: payload.unlockedSkills,
        unlockedCosmetics: payload.unlockedCosmetics,
        equippedWeapon: payload.equippedWeapon,
        equippedOutfit: payload.equippedOutfit,
        equippedGlasses: payload.equippedGlasses,
        equippedHair: payload.equippedHair,
        equippedAura: payload.equippedAura,
        vitalityLevel: payload.vitalityLevel,
        powerLevel: payload.powerLevel,
        gravMasteryLevel: payload.gravMasteryLevel,
        dailyStreak: payload.dailyStreak,
        lastDailyClaimDate: payload.lastDailyClaimDate,
        completedDailyChallenges: payload.completedDailyChallenges,
        highScore: payload.highScore,
        infiniteLife: payload.infiniteLife,
        updatedAt: serverTimestamp(),
      });
    }
    markPendingSync(false);
  } catch (error) {
    markPendingSync(true);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function submitLeaderboardScore(
  uid: string,
  entry: Omit<LeaderboardEntry, 'uid' | 'isPublic' | 'updatedAt'>
): Promise<void> {
  if (!navigator.onLine) return;
  const path = `leaderboard/${uid}`;
  const ref = doc(db, 'leaderboard', uid);

  try {
    const existing = await getDoc(ref);
    const prevBest = existing.exists() ? (existing.data().score as number) : 0;
    if (entry.score < prevBest) return;

    await setDoc(ref, {
      uid,
      playerName: sanitizeDisplayName(entry.playerName),
      score: Math.max(0, Math.min(999999999, Math.floor(entry.score))),
      zoneReached: Math.max(1, Math.min(5, Math.floor(entry.zoneReached))),
      weapon: entry.weapon,
      outfitId: entry.outfitId.slice(0, 48),
      difficultyPeak: Math.max(1, Math.min(5, Number(entry.difficultyPeak.toFixed(2)))),
      isPublic: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!navigator.onLine) {
    return loadCachedLeaderboard();
  }
  const path = 'leaderboard';
  try {
    const q = query(
      collection(db, 'leaderboard'),
      where('isPublic', '==', true),
      orderBy('score', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => d.data() as LeaderboardEntry);
    try {
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(rows));
    } catch {}
    return rows;
  } catch (error) {
    // Return cached leaderboard if offline or index warming up, but log structured error if permission denied
    if (error instanceof Error && error.message.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    return loadCachedLeaderboard();
  }
}

export function loadCachedLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    if (raw) return JSON.parse(raw) as LeaderboardEntry[];
  } catch {}
  return [];
}

export type FeedbackCategory =
  | 'Gameplay'
  | 'Zones & Bosses'
  | 'Weapons & Skills'
  | 'Audio & Controls'
  | 'Bug Report';

export interface GameFeedbackItem {
  id: string;
  uid: string;
  authorName: string;
  category: FeedbackCategory;
  rating: number;
  message: string;
  isPublic: boolean;
  createdAtLabel?: string;
}

const LOCAL_FEEDBACK_KEY = 'aethershift_feedback_v1';

export function loadLocalFeedback(): GameFeedbackItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_FEEDBACK_KEY);
    if (raw) return JSON.parse(raw) as GameFeedbackItem[];
  } catch {}
  return [];
}

function saveLocalFeedback(items: GameFeedbackItem[]) {
  try {
    localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(items.slice(0, 40)));
  } catch {}
}

export async function submitGameFeedback(
  uid: string | null,
  authorName: string,
  category: FeedbackCategory,
  rating: number,
  message: string
): Promise<GameFeedbackItem> {
  const cleanMsg = message.trim().slice(0, 500);
  const cleanName = sanitizeDisplayName(authorName);
  const cleanRating = Math.max(1, Math.min(5, Math.round(rating)));
  const id = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const item: GameFeedbackItem = {
    id,
    uid: uid || 'offline-guest',
    authorName: cleanName,
    category,
    rating: cleanRating,
    message: cleanMsg,
    isPublic: true,
    createdAtLabel: new Date().toLocaleDateString(),
  };

  const existingLocal = loadLocalFeedback();
  saveLocalFeedback([item, ...existingLocal]);

  if (uid && navigator.onLine) {
    const path = `feedback/${id}`;
    try {
      await setDoc(doc(db, 'feedback', id), {
        uid,
        authorName: cleanName,
        category,
        rating: cleanRating,
        message: cleanMsg,
        isPublic: true,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  return item;
}

export async function fetchGameFeedback(): Promise<GameFeedbackItem[]> {
  const localItems = loadLocalFeedback();
  if (!navigator.onLine) return localItems;
  const path = 'feedback';
  try {
    const q = query(
      collection(db, 'feedback'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    const cloudItems: GameFeedbackItem[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        uid: String(data.uid || ''),
        authorName: String(data.authorName || 'Player'),
        category: (data.category as FeedbackCategory) || 'Gameplay',
        rating: Number(data.rating || 5),
        message: String(data.message || ''),
        isPublic: true,
        createdAtLabel: 'Synced',
      };
    });
    // Merge unique items keeping local offline posts visible
    const seen = new Set(cloudItems.map((c) => c.id));
    const merged = [...cloudItems, ...localItems.filter((l) => !seen.has(l.id))];
    return merged.slice(0, 30);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    return localItems;
  }
}

