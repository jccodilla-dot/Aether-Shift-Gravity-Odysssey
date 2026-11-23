# Security Specification: Gravity Shift Odyssey

## 1. Data Invariants
1. **Identity Integrity**: A `PlayerProfile` at `/players/{playerId}` can only be read, created, or updated by the verified authenticated owner (`request.auth.uid == playerId`), and `incoming().uid` must equal `request.auth.uid`.
2. **Leaderboard Ownership**: A `LeaderboardEntry` at `/leaderboard/{entryId}` is keyed by `entryId == request.auth.uid` for writes, preventing impersonation or flooding.
3. **Immutable Creation Metadata**: `uid` and `createdAt` on `/players/{playerId}` are immutable once created, and `createdAt` / `updatedAt` must match `request.time`.
4. **Strict Payload Boundaries**: Every string, number, and array field is bounded in size/range, and unexpected shadow keys are rejected via `keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`.
5. **No Client-Delegated List Leaks**: `/players` cannot be listed; `/leaderboard` list queries explicitly enforce `resource.data.isPublic == true`.

## 2. Dirty Dozen Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. Unauthenticated read on `/players/user_1`.
2. Cross-user read on `/players/user_2` by `user_1`.
3. Cross-user write on `/players/user_2` by `user_1`.
4. Spoofed `uid` inside `/players/user_1` payload (`uid: "user_2"`).
5. Unverified email user attempting create/update on `/players/user_1`.
6. Shadow key injection (`{ ..., isAdmin: true }`) on `/players/user_1`.
7. Oversized `displayName` (> 48 chars) or invalid `playerId` (`"../evil"`).
8. Forged past/future `createdAt` or `updatedAt` timestamp not equal to `request.time`.
9. Attempting to mutate immutable `createdAt` or `uid` on `/players/user_1` update.
10. Unbounded array injection (`unlockedCosmetics` with > 40 entries).
11. Unauthenticated or cross-user write to `/leaderboard/user_2` by `user_1`.
12. Negative or astronomical `score` (< 0 or > 999999999) or `isPublic: false` injection on `/leaderboard/user_1`.
