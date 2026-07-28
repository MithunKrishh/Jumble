import { DashboardState } from "@/types/dashboard";

const STORAGE_PREFIX = "jumble:dashboard";
const SETUP_RESET_PREFIX = "jumble:setup-reset";
const CACHE_BUST_PREFIX = "jumble:cache-bust";

const getStorageKey = (userId: string) => `${STORAGE_PREFIX}:${userId}`;
const getSetupResetKey = (userId: string) => `${SETUP_RESET_PREFIX}:${userId}`;
const getCacheBustKey = (userId: string) => `${CACHE_BUST_PREFIX}:${userId}`;

export const dashboardStorage = {
  load(userId: string): DashboardState | null {
    try {
      const raw = localStorage.getItem(getStorageKey(userId));
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as DashboardState;
    } catch {
      return null;
    }
  },

  save(state: DashboardState): void {
    localStorage.setItem(getStorageKey(state.userId), JSON.stringify(state));
  },

  clear(userId: string): void {
    localStorage.removeItem(getStorageKey(userId));
  },

  requestSetupReset(userId: string): void {
    localStorage.setItem(getSetupResetKey(userId), "1");
  },

  clearSetupResetRequest(userId: string): void {
    localStorage.removeItem(getSetupResetKey(userId));
  },

  isSetupResetRequested(userId: string): boolean {
    return localStorage.getItem(getSetupResetKey(userId)) === "1";
  },

  // Cache invalidation — increment this version to force ActiveDashboard re-fetch
  bustTopicCache(userId: string): void {
    const key = getCacheBustKey(userId);
    const current = parseInt(localStorage.getItem(key) ?? "0", 10);
    localStorage.setItem(key, String(current + 1));
  },

  getTopicCacheVersion(userId: string): number {
    const key = getCacheBustKey(userId);
    return parseInt(localStorage.getItem(key) ?? "0", 10);
  },
};
