import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { AppState } from "@/lib/types";
import type { NotesBackup } from "@/lib/notes/db";
import type { CloudLocalContent } from "@/lib/cloud-local-content";

/**
 * One account snapshot. Everything Knowly owns travels together: decks,
 * courses, modules, progress, settings, media, notebook pages, restore points
 * and the text pages attached to module print layouts.
 */
export type CloudSnapshot = Partial<AppState> &
  Partial<CloudLocalContent> & { notes?: NotesBackup };

export interface CloudAppState {
  state: CloudSnapshot;
  updatedAt: string;
}

function toJson(value: CloudSnapshot): Json {
  const serialized = JSON.stringify(value);
  if (!serialized) throw new Error("Could not serialize the app state for cloud sync.");
  return JSON.parse(serialized) as Json;
}

function asSnapshot(payload: unknown): CloudSnapshot {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The cloud backup has an invalid format.");
  }
  return payload as CloudSnapshot;
}

export async function loadCloudAppState(userId: string): Promise<CloudAppState | null> {
  const { data, error } = await supabase
    .from("user_app_state")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    state: asSnapshot(data.payload),
    updatedAt: data.updated_at,
  };
}

export async function createCloudAppState(userId: string, state: CloudSnapshot) {
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from("user_app_state")
    .insert({ user_id: userId, payload: toJson(state), updated_at: updatedAt });

  if (error) throw error;
  return updatedAt;
}

export async function replaceCloudAppState(
  userId: string,
  state: CloudSnapshot,
  expectedUpdatedAt: string,
) {
  const updatedAt = new Date(Math.max(Date.now(), Date.parse(expectedUpdatedAt) + 1)).toISOString();
  const { data, error } = await supabase
    .from("user_app_state")
    .update({ payload: toJson(state), updated_at: updatedAt })
    .eq("user_id", userId)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data.updated_at;
}

export async function overwriteCloudAppState(userId: string, state: CloudSnapshot) {
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from("user_app_state")
    .upsert(
      { user_id: userId, payload: toJson(state), updated_at: updatedAt },
      { onConflict: "user_id" },
    );

  if (error) throw error;
  return updatedAt;
}
