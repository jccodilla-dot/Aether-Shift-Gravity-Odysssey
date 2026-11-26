import { createDefaultProfile, MAX_ZONE } from '../game/catalog';
import { LeaderboardEntry, PlayerProfile } from '../game/types';

const LOCAL_PROFILE_KEY = 'aethershift_profile_v1';
const LOCAL_LEADERBOARD_KEY = 'aethershift_leaderboard_cache_v1';
const LOCAL_FEEDBACK_KEY = 'aethershift_feedback_v1';

function sanitizeDisplayName(name: string): string {
  const cleaned = (name || 'Sky Runner').trim().slice(0, 48);
  return cleaned.length > 0 ? cleaned : 'Sky Runner';
}

export function loadLocalProfile(): PlayerProfile {
  const defaults = createDefaultProfile();
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
      const merged: PlayerProfile = { ...defaults, ...parsed };
      // Upgrade legacy default name to Sky Runner while keeping custom names
      if (!merged.displayName || merged.displayName === 'Astra Runner') {
        merged.displayName = 'Sky Runner';
      }
      merged.unlockedZone = Math.max(1, Math.min(MAX_ZONE, Math.floor(merged.unlockedZone || 1)));
      merged.lifeCredits = Math.max(1, Math.min(99, Math.floor(merged.lifeCredits ?? 3)));
      if (typeof merged.usePhotoCharacter !== 'boolean') {
        merged.usePhotoCharacter = true;
      }
      return merged;
    }
  } catch {
    // ignore storage errors
  }
  return defaults;
}

export function saveLocalProfile(profile: PlayerProfile) {
  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // If custom photo exceeds quota, preserve progress without crashing
    try {
      const fallback = { ...profile, customPhotoDataUrl: null };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(fallback));
    } catch {
      // ignore storage errors
    }
  }
}

export function loadCachedLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    if (raw) {
      const rows = JSON.parse(raw) as LeaderboardEntry[];
      return rows.sort((a, b) => b.score - a.score).slice(0, 25);
    }
  } catch {
    // ignore
  }
  return [];
}

export function submitLocalLeaderboardScore(
  entry: Omit<LeaderboardEntry, 'uid' | 'isPublic' | 'updatedAt'>
): LeaderboardEntry[] {
  const existing = loadCachedLeaderboard();
  const nextRow: LeaderboardEntry = {
    uid: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    playerName: sanitizeDisplayName(entry.playerName),
    score: Math.max(0, Math.min(999999999, Math.floor(entry.score))),
    zoneReached: Math.max(1, Math.min(MAX_ZONE, Math.floor(entry.zoneReached))),
    weapon: entry.weapon,
    outfitId: entry.outfitId.slice(0, 48),
    difficultyPeak: Math.max(1, Math.min(20, Number(entry.difficultyPeak.toFixed(2)))),
    isPublic: true,
    updatedAt: new Date().toLocaleDateString(),
  };

  const merged = [nextRow, ...existing]
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);

  try {
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
  return merged;
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

export function loadLocalFeedback(): GameFeedbackItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_FEEDBACK_KEY);
    if (raw) return JSON.parse(raw) as GameFeedbackItem[];
  } catch {
    // ignore
  }
  return [];
}

function saveLocalFeedback(items: GameFeedbackItem[]) {
  try {
    localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(items.slice(0, 40)));
  } catch {
    // ignore
  }
}

export async function submitGameFeedback(
  _uid: string | null,
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
    uid: 'offline-local',
    authorName: cleanName,
    category,
    rating: cleanRating,
    message: cleanMsg,
    isPublic: true,
    createdAtLabel: new Date().toLocaleDateString(),
  };

  const existingLocal = loadLocalFeedback();
  saveLocalFeedback([item, ...existingLocal]);
  return item;
}

export async function fetchGameFeedback(): Promise<GameFeedbackItem[]> {
  return loadLocalFeedback();
}
