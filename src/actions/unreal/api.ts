"use server";

import { supabase } from "../../lib/supabase.ts";
import { getUserByWallet } from "../supabase/users.ts";
import {
  ApiKeyError,
  GetAllApiKeysResponse,
  UnrealApiKeyResponse,
} from "../../utils/types.ts";
import { unrealApiUrl } from "../../utils/config.ts";

// Generate new Unreal API Key
export const createUnrealApiKey = async (
  userWallet: string,
  apiName: string
) => {
  try {
    console.log(
      "Creating Unreal API key for wallet",
      userWallet,
      "with name",
      apiName
    );

    if (!userWallet || !apiName) {
      throw new Error("User wallet and API name are required");
    }

    // Step 2: Get user from Supabase by wallet
    const userRes = await getUserByWallet(userWallet);
    if (!userRes.success) {
      throw new Error(
        userRes.message || "Failed to retrieve user from Supabase"
      );
    }
    const user = userRes.data;

    // Step 3: Get unreal_token from user
    const unrealToken = user.unreal_token;
    if (!unrealToken) {
      throw new Error("No Unreal session token found for the user");
    }

    // Step 4: Call POST /v1/keys
    const response = await fetch(`${unrealApiUrl}/v1/keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${unrealToken}`,
      },
      body: JSON.stringify({
        name: apiName,
      }),
    });

    if (!response.ok) {
      const errorData: ApiKeyError = await response.json();
      throw new Error(errorData.error || "Failed to create API key");
    }

    // Step 5: Parse the successful response
    const data: UnrealApiKeyResponse = await response.json();

    // Step 6: Save API key information in supabase api_keys table
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from("api_keys")
      .insert([
        {
          user: user.id,
          provider: "unreal",
          api_key: data.key,
          api_hash: data.hash,
          api_name: data.state.name,
          payment_token: data.state.paymentToken,
          calls: data.state.calls,
          initial_calls: data.state.calls,
        },
      ])
      .select("*");

    if (apiKeyError) {
      throw new Error(
        `Failed to save API key to Supabase: ${apiKeyError.message}`
      );
    }

    if (!apiKeyData || !apiKeyData.length) {
      throw new Error("No API key data returned after insertion");
    }

    return {
      success: true,
      data: {
        apiKey: apiKeyData[0],
        unrealResponse: data,
      },
    };
  } catch (error) {
    console.error(
      "Error creating Unreal API key:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the API key.",
    };
  }
};

// Repeat similar relative path changes for getAllUnrealApiKeys and deleteApiKey
