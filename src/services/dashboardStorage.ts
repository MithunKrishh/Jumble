import { DashboardState } from "@/types/dashboard";

const STORAGE_PREFIX = "jumble:dashboard";
const SETUP_RESET_PREFIX = "jumble:setup-reset";

const getStorageKey = (userId: string) => `${STORAGE_PREFIX}:${userId}`;
const getSetupResetKey = (userId: string) => `${SETUP_RESET_PREFIX}:${userId}`;

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
};
