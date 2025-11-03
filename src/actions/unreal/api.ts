"use server";

import { supabase } from "@/lib/supabase";
import { getUserByWallet } from "../supabase/users";
import {
  ApiKeyError,
  GetAllApiKeysResponse,
  UnrealApiKeyResponse,
} from "@/utils/types";
import { unrealApiUrl } from "@/utils/config";

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
          user: user.id, // user.id is the foreign key referencing user_profiles.id
          provider: "unreal",
          api_key: data.key,
          api_hash: data.hash,
          api_name: data.state.name,
          payment_token: data.state.paymentToken,
          calls: data.state.calls,
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

// Get all user's API keys from Unreal API
export const getAllUnrealApiKeys = async (userWallet: string) => {
  try {
    console.log("Getting all Unreal API keys for wallet", userWallet);

    if (!userWallet) {
      throw new Error("User wallet is required");
    }

    // Step 1: Get user from Supabase by wallet
    const userRes = await getUserByWallet(userWallet);
    if (!userRes.success) {
      throw new Error(
        userRes.message || "Failed to retrieve user from Supabase"
      );
    }
    const user = userRes.data;

    // Step 2: Get unreal_token from user
    const unrealToken = user.unreal_token;
    if (!unrealToken) {
      throw new Error("No Unreal session token found for the user");
    }

    // Step 3: Call GET /v1/keys
    const response = await fetch(`${unrealApiUrl}/v1/keys`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${unrealToken}`,
      },
    });

    if (!response.ok) {
      const errorData: ApiKeyError = await response.json();
      throw new Error(errorData.error || "Failed to retrieve API keys");
    }

    // Step 4: Parse the successful response
    const data: GetAllApiKeysResponse = await response.json();

    // Step 5: Return the array of keys
    return {
      success: true,
      data: data.keys,
    };
  } catch (error) {
    console.error(
      "Error getting all Unreal API keys:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong while retrieving API keys.",
    };
  }
};

// Delete an user own Unreal API key by the key
export const deleteApiKey = async (key: string, userWallet: string) => {
  try {
    console.log("Deleting Unreal API key", key, "for wallet", userWallet);

    if (!key || !userWallet) {
      throw new Error("API key and user wallet are required");
    }

    // Step 1: Get user from Supabase by wallet
    const userRes = await getUserByWallet(userWallet);
    if (!userRes.success) {
      throw new Error(
        userRes.message || "Failed to retrieve user from Supabase"
      );
    }
    const user = userRes.data;

    // Step 2: Get unreal_token from user
    const unrealToken = user.unreal_token;
    if (!unrealToken) {
      throw new Error("No Unreal session token found for the user");
    }

    // Step 3: Call DELETE /v1/keys/{key}
    const response = await fetch(`${unrealApiUrl}/v1/keys/${key}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${unrealToken}`,
      },
    });

    if (!response.ok) {
      const errorData: ApiKeyError = await response.json();
      throw new Error(errorData.error || "Failed to delete API key");
    }

    // Step 4: Parse the successful response
    const data = await response.json();
    if (!data.deleted) {
      throw new Error("API key deletion was not confirmed by Unreal API");
    }

    // Step 5: Delete the API key from Supabase api_keys table
    const { error: deleteError } = await supabase
      .from("api_keys")
      .delete()
      .eq("api_key", key)
      .eq("user", user.id);

    if (deleteError) {
      throw new Error(
        `Failed to delete API key from Supabase: ${deleteError.message}`
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "Error deleting Unreal API key:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong while deleting the API key.",
    };
  }
};
