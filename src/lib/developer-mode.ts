let unlocked = false;

export function unlockDeveloperMode(): void {
  if (import.meta.env.DEV) unlocked = true;
}

export function lockDeveloperMode(): void {
  unlocked = false;
}

export function isDeveloperModeUnlocked(): boolean {
  return import.meta.env.DEV && unlocked;
}
