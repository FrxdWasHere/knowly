/**
 * Settings store a data URL for the wallpaper. This hook exists so the
 * rest of the UI can keep asking for a renderable URL without caring
 * how the image is stored.
 */
export function useWallpaperUrl(value: string | null): string | null {
  return value;
}
