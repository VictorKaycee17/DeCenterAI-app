"use server";

import { supabase } from "@/lib/supabase";
import { UnrealApiKey } from "@/utils/types";

// Convert unix timestamp (seconds) to ISO string
function toIsoStringFromUnix(unix: number | undefined) {
  if (!unix) return null;
  // multiply by 1000 if it's in seconds
  return new Date(unix * 1000).toISOString();
}

// Sync all user's API keys with Unreal API and update api_keys table in Supabase
export const syncApiKeysWithUnreal = async (
  userId: number,
  unrealApiKeys: UnrealApiKey[]
) => {
  try {
    console.log("syncApiKeysWithUnreal", userId, unrealApiKeys);

    if (!userId || !unrealApiKeys?.length) {
      throw new Error("User ID and Unreal API keys are required");
    }

    // Get all hashes for this user at once
    const hashes = unrealApiKeys.map((k) => k.hash).filter(Boolean);

    const { data: existingKeys, error: fetchError } = await supabase
      .from("api_keys")
      .select("id, api_hash")
      .eq("user", userId)
      .in("api_hash", hashes);

    if (fetchError) throw fetchError;

    const existingKeyMap = new Map(
      (existingKeys ?? []).map((k) => [k.api_hash, k.id])
    );

    // Prepare updates in parallel
    const updates = unrealApiKeys
      .filter((k) => k.hash && existingKeyMap.has(k.hash))
      .map((k) => {
        const lastUsed =
          toIsoStringFromUnix(k.updatedAt) ?? new Date().toISOString();

        return supabase
          .from("api_keys")
          .update({
            calls: k.calls,
            chain_id: k.chainId,
            last_used: lastUsed,
          })
          .eq("id", existingKeyMap.get(k.hash)!);
      });

    // Run all updates concurrently
    const results = await Promise.all(updates);

    // Check for errors
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;

    return { success: true };
  } catch (error) {
    console.error(
      "Error syncing API keys:",
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to sync API keys",
    };
  }
};

// Get all user's API keys from Supabase api_keys table
export const getApiKeysByUser = async (userId: number) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user", userId)
      .eq("provider", "unreal");

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error(
      "Error fetching API keys:",
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch API keys",
    };
  }
};
