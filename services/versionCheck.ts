/**
 * Version Check Service
 * Detects when a new version of the app has been deployed
 * and notifies users to refresh for the latest updates.
 */

// Current build timestamp - this gets updated on each build
const BUILD_TIMESTAMP = Date.now();
const REQUEST_TIMEOUT_MS = 5000;

interface VersionInfo {
  version: string;
  buildTime: number;
  changelog?: string;
}

type UpdateCallback = (newVersion: VersionInfo) => void;

class VersionCheckService {
  private currentVersion: string;
  private checkInterval: number | null = null;
  private callbacks: UpdateCallback[] = [];
  private hasNewVersion = false;
  private newVersionInfo: VersionInfo | null = null;
  private hasLoggedFailure = false;

  constructor() {
    // Generate version from build timestamp
    this.currentVersion = this.generateVersionString(BUILD_TIMESTAMP);
  }

  private generateVersionString(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}.${date.getHours()}${date.getMinutes()}`;
  }

  /**
   * Start checking for updates periodically
   * @param intervalMs How often to check (default: 5 minutes)
   */
  startChecking(intervalMs: number = 5 * 60 * 1000): void {
    if (this.checkInterval) return;

    // Check immediately on start
    this.checkForUpdate();

    // Then check periodically
    this.checkInterval = window.setInterval(() => {
      this.checkForUpdate();
    }, intervalMs);

    // Also check when tab becomes visible
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.checkForUpdate();
    }
  };

  /**
   * Check for a new version by fetching `version.json` relative to the app base
   */
  async checkForUpdate(): Promise<boolean> {
    try {
      // Avoid noisy errors when offline
      if (!navigator.onLine) return false;

      // Abort fetch if it hangs
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      // Fetch `version.json` relative to the app base (avoids root/absolute fetches)
      const url = `${import.meta.env.BASE_URL}version.json?_=${Date.now()}`;
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) return false;

      const json = await response.json();
      const serverVersion = typeof json?.version === 'string' ? json.version : null;

      // Compare against acknowledged (stored) version and notify only if different
      if (!serverVersion) return false;

      const storedVersion = localStorage.getItem('aetherius-version');
      if (!storedVersion) {
        // Seed acknowledged version to avoid notifying immediately on first run
        localStorage.setItem('aetherius-version', serverVersion);
        this.currentVersion = serverVersion;
        return false;
      }

      if (serverVersion !== storedVersion) {
        this.hasNewVersion = true;
        this.newVersionInfo = {
          version: serverVersion,
          buildTime: Date.now(),
        };
        this.notifyCallbacks();
        return true;
      }




      return false;
    } catch (error: any) {
      // Silent on deliberate aborts (timeout or manual)
      if (error?.name === 'AbortError') {
        return false;
      }
      // Log only once to avoid console spam when offline/blocked
      if (!this.hasLoggedFailure) {
        console.warn('Version check failed (will be suppressed after this):', error);
        this.hasLoggedFailure = true;
      }
      return false;
    }
  }




  /**
   * Subscribe to update notifications
   */
  onUpdate(callback: UpdateCallback): () => void {
    this.callbacks.push(callback);

    // If we already have a new version, notify immediately
    if (this.hasNewVersion && this.newVersionInfo) {
      callback(this.newVersionInfo);
    }

    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private notifyCallbacks(): void {
    if (!this.newVersionInfo) return;
    this.callbacks.forEach(cb => cb(this.newVersionInfo!));
  }

  /**
   * Mark the current version as acknowledged
   */
  acknowledgeUpdate(): void {
    if (this.newVersionInfo) {
      localStorage.setItem('aetherius-version', this.newVersionInfo.version);
    }
    this.hasNewVersion = false;
    this.newVersionInfo = null;
  }

  /**
   * Refresh the page to load the new version
   */
  refresh(): void {
    this.acknowledgeUpdate();
    window.location.reload();
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  hasUpdate(): boolean {
    return this.hasNewVersion;
  }
}

// Singleton instance
let versionCheckInstance: VersionCheckService | null = null;

export function getVersionChecker(): VersionCheckService {
  if (!versionCheckInstance) {
    versionCheckInstance = new VersionCheckService();
  }
  return versionCheckInstance;
}

export type { VersionInfo };
