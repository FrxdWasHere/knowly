import { useMemo } from "react";

/**
 * Hook to get a safely renderable avatar URL.
 * Returns a local image data URL or a trusted Google profile photo URL.
 */
export function useAvatarUrl(avatarImage: string | null | undefined): string | null {
  return useMemo(() => {
    if (!avatarImage) return null;
    if (avatarImage.startsWith("data:image/")) return avatarImage;
    try {
      const url = new URL(avatarImage);
      if (
        url.protocol === "https:" &&
        (url.hostname === "googleusercontent.com" ||
          url.hostname.endsWith(".googleusercontent.com"))
      ) {
        return url.href;
      }
    } catch {
      return null;
    }
    return null;
  }, [avatarImage]);
}
