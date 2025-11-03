"use server";

import { unrealApiUrl } from "@/utils/config";

export interface NetworkHealth {
  status: string;
  nearai?: { healthy: boolean };
  "github-models"?: { healthy: boolean };
}

/**
 * Fetch Unreal Network health status
 * @returns NetworkHealth response or error state
 */
export async function getNetworkHealth(): Promise<{
  success: boolean;
  data?: NetworkHealth;
  message?: string;
}> {
  try {
    const res = await fetch(`${unrealApiUrl}/v1/health`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed with status ${res.status}`);
    }

    const data: NetworkHealth = await res.json();

    return { success: true, data };
  } catch (error) {
    console.error("Error Get Network Health:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch network health",
    };
  }
}
