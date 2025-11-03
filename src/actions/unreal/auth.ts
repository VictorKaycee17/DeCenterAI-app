"use server";

import { unrealApiUrl } from "@/utils/config";
import {
  UnrealRegisterResponse,
  UnrealVerifyTokenResponse,
} from "@/utils/types";

// Register with the Unreal API to obtain session token
export const registerUnrealApiAccess = async (
  messagePayload: string,
  walletAddress: string,
  signature: string,
  permitPayload?: string,
  permitSignature?: string
): Promise<UnrealRegisterResponse> => {
  try {
    // Prepare payload for Unreal AI API registration
    const payload = JSON.parse(messagePayload);

    // Build request body
    const body = JSON.stringify({
      payload,
      signature,
      address: walletAddress,
      ...(permitPayload ? { permit: JSON.parse(permitPayload) } : {}),
      ...(permitSignature ? { permitSignature } : {}),
    });

    console.debug("Unreal registration body", body);

    // Register to Unreal AI API
    const response = await fetch(`${unrealApiUrl}/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Unreal registration error", data);
      throw new Error(data.error || "Unreal Registration failed");
    }

    console.debug("Unreal registration data", data);

    return {
      success: true,
      unrealToken: data.token,
    };
  } catch (error) {
    console.error("Error register Unreal API", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Verify the validity of Unreal API session token
export const verifyUnrealSessionToken = async (
  sessionToken: string
): Promise<UnrealVerifyTokenResponse> => {
  try {
    const response = await fetch(
      `${unrealApiUrl}/v1/auth/verify?token=${sessionToken}`,
      {
        method: "GET",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Verify token failed", data);
      return { success: false, message: data.error || "Invalid token" };
    }

    console.debug("Verify Session Token response", data);

    return { success: true, data };
  } catch (error) {
    console.error("Error verifying Unreal session token:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to verify token",
    };
  }
};
