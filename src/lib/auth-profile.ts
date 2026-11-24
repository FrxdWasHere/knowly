export interface AuthProfilePrefill {
  firstName: string | null;
  avatarUrl: string | null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getAuthProfilePrefill(metadata: unknown): AuthProfilePrefill {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { firstName: null, avatarUrl: null };
  }

  const profile = metadata as Record<string, unknown>;
  const firstNameSource =
    stringValue(profile["given_name"]) ??
    stringValue(profile["full_name"]) ??
    stringValue(profile["name"]);
  const firstName = firstNameSource?.split(/\s+/)[0] ?? null;
  const candidateAvatar = stringValue(profile["avatar_url"]) ?? stringValue(profile["picture"]);
  let avatarUrl: string | null = null;

  if (candidateAvatar) {
    try {
      const url = new URL(candidateAvatar);
      if (
        url.protocol === "https:" &&
        (url.hostname === "googleusercontent.com" ||
          url.hostname.endsWith(".googleusercontent.com"))
      ) {
        avatarUrl = url.href;
      }
    } catch {
      avatarUrl = null;
    }
  }

  return { firstName, avatarUrl };
}
