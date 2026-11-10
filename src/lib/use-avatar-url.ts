import { useMemo } from "react";

/**
 * Hook to get a safely renderable avatar URL.
 * Returns the image URL if set, or null to fall back to emoji.
 */
export function useAvatarUrl(avatarImage: string | null | undefined): string | null {
  return useMemo(() => {
    if (!avatarImage) return null;
    // Validate it's a data URL
    if (avatarImage.startsWith("data:image/")) return avatarImage;
    return null;
  }, [avatarImage]);
}
