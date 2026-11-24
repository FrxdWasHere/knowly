import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  normalizeInviteEmails,
  parseShareSnapshot,
  SHARE_RESOURCE_TYPES,
  isValidInviteEmail,
  type ShareResourceType,
  type ShareSnapshot,
  type SharedResource,
} from "@/lib/share-content";

export type ShareVisibility = "anyone" | "restricted";

export interface ShareLinkSettings {
  token: string;
  visibility: ShareVisibility;
  allowedEmails: string[];
}

function isShareVisibility(value: string): value is ShareVisibility {
  return value === "anyone" || value === "restricted";
}

function isShareResourceType(value: string): value is ShareResourceType {
  return SHARE_RESOURCE_TYPES.some((resourceType) => resourceType === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJson(value: ShareSnapshot): Json {
  const serialized = JSON.stringify(value);
  if (!serialized) throw new Error("Could not serialize this resource for sharing.");
  return JSON.parse(serialized) as Json;
}

function createShareToken(): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("This browser cannot create a secure share link.");
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function loadShareLink(
  ownerId: string,
  resourceType: ShareResourceType,
  resourceId: string,
): Promise<ShareLinkSettings | null> {
  const { data, error } = await supabase
    .from("share_links")
    .select("share_token, visibility, allowed_emails")
    .eq("owner_id", ownerId)
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .maybeSingle();

  if (error) throw error;
  if (!data || !isShareVisibility(data.visibility)) return null;
  return {
    token: data.share_token,
    visibility: data.visibility,
    allowedEmails: normalizeInviteEmails(data.allowed_emails),
  };
}

export async function saveShareLink(input: {
  ownerId: string;
  resourceType: ShareResourceType;
  resourceId: string;
  title: string;
  payload: ShareSnapshot;
  visibility: ShareVisibility;
  allowedEmails: string[];
  existingToken?: string;
}): Promise<ShareLinkSettings> {
  const allowedEmails =
    input.visibility === "restricted" ? normalizeInviteEmails(input.allowedEmails) : [];
  if (allowedEmails.some((email) => !isValidInviteEmail(email))) {
    throw new Error("One or more invited email addresses are invalid.");
  }
  if (input.visibility === "restricted" && !allowedEmails.length) {
    throw new Error("Add at least one email address for a restricted link.");
  }
  if (allowedEmails.length > 50) {
    throw new Error("A share link can be restricted to at most 50 people.");
  }
  const title = input.title.trim().slice(0, 200);
  if (!title) throw new Error("Add a title before sharing this resource.");
  if (input.payload.resourceType !== input.resourceType) {
    throw new Error("The shared content does not match this resource type.");
  }

  const { data, error } = await supabase
    .from("share_links")
    .upsert(
      {
        owner_id: input.ownerId,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        title,
        payload: toJson(input.payload),
        visibility: input.visibility,
        allowed_emails: allowedEmails,
        share_token: input.existingToken ?? createShareToken(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,resource_type,resource_id" },
    )
    .select("share_token, visibility, allowed_emails")
    .single();

  if (error) throw error;
  if (!isShareVisibility(data.visibility)) {
    throw new Error("The share link was saved with an unsupported access setting.");
  }
  return {
    token: data.share_token,
    visibility: data.visibility,
    allowedEmails: normalizeInviteEmails(data.allowed_emails),
  };
}

export async function deleteShareLink(
  ownerId: string,
  resourceType: ShareResourceType,
  resourceId: string,
): Promise<void> {
  const { error } = await supabase
    .from("share_links")
    .delete()
    .eq("owner_id", ownerId)
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId);
  if (error) throw error;
}

export async function readSharedResource(token: string): Promise<SharedResource | null> {
  const { data, error } = await supabase.rpc("read_shared_resource", { p_token: token });
  if (error) throw error;
  if (!isRecord(data) || typeof data.title !== "string" || typeof data.resourceType !== "string") {
    return null;
  }

  const payload = parseShareSnapshot(data.payload);
  if (
    !payload ||
    !isShareResourceType(data.resourceType) ||
    payload.resourceType !== data.resourceType
  ) {
    return null;
  }

  return {
    title: data.title,
    resourceType: data.resourceType,
    payload,
  };
}

export function isValidShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
