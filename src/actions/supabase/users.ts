"use server";

import { supabase } from "@/lib/supabase.ts";
import { revalidatePath } from "next/cache.js";

interface IUserUnrealToken {
  unreal_token: string;
}

interface IUserProfile {
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  email?: string | null;
  bio?: string | null;
  profile_image?: string | File | null;
}

// Get or create a user from Supabase users table by email address
export const getOrCreateUser = async (email: string, userWallet: string) => {
  try {
    // If the user email is present in the supabase database,
    // then return the user, else create a new user and return the user

    console.log("Get user from supabase by email:", email);

    if (!userWallet || !email)
      throw new Error("No user email / wallet provided");

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email);

    if (error) throw error;

    if (data && data.length) {
      return {
        success: true,
        data: data[0],
        isNewUser: false,
      };
    }

    // Create a new user in the supabase DB
    const newUserObj = {
      wallet: userWallet,
      is_active: true,
      is_admin: false,
      email,
    };
    const { data: newUser, error: newUserError } = await supabase
      .from("user_profiles")
      .insert([newUserObj])
      .select("*");

    if (newUserError) throw newUserError;

    return {
      success: true,
      data: newUser[0],
      isNewUser: true,
    };
  } catch (error) {
    console.error("Error getting / creating user from Supabase.", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
};

export const getUserByWallet = async (userWallet: string) => {
  try {
    console.log("Get user from supabase by wallet:", userWallet);

    if (!userWallet) throw new Error("No user wallet provided");

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("wallet", userWallet);

    if (error) throw error;

    return {
      success: true,
      data: data[0],
    };
  } catch (error) {
    console.error("Error getting user from Supabase by wallet address", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    console.log("Get user from supabase by email:", email);

    if (!email) throw new Error("No user email provided");

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email);

    if (error) throw error;

    return {
      success: true,
      data: data[0],
    };
  } catch (error) {
    console.error("Error getting user from Supabase by email", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
};

// Update an user's unreal session token in Supabase users table by wallet address
export const updateUserUnrealToken = async (
  userWallet: string,
  userUnrealToken: IUserUnrealToken
) => {
  try {
    console.log(
      "Update user unreal token in supabase",
      userWallet,
      userUnrealToken
    );

    if (!userWallet) throw new Error("No user wallet provided");

    const { data, error } = await supabase
      .from("user_profiles")
      .update(userUnrealToken)
      .eq("wallet", userWallet)
      .select("*");

    if (error) throw error;

    if (!data || !data.length) {
      throw new Error("User not found or update failed");
    }

    return {
      success: true,
      data: data[0],
    };
  } catch (error) {
    console.error("Error updating user in Supabase.", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
};

// update an user profile (with profile image) in users table
export const updateUserProfile = async (
  wallet: string,
  updates: IUserProfile
) => {
  try {
    if (!wallet) {
      throw new Error("Wallet address is required");
    }

    const { data: user, error: fetchError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("wallet", wallet)
      .single();

    if (fetchError || !user) {
      throw new Error(fetchError?.message || "User not found");
    }

    let profileImageUrl: string | undefined = updates.profile_image as string;

    // Handle image upload if provided as a File
    if (updates.profile_image instanceof File) {
      const file = updates.profile_image;
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${wallet}.${fileExt}`;
      const fileSizeMB = file.size / (1024 * 1024);

      if (fileSizeMB > 1) {
        throw new Error("Image size must not exceed 5MB");
      }

      if (
        !["jpg", "jpeg", "png", "gif"].includes(fileExt?.toLowerCase() || "")
      ) {
        throw new Error("Only image files (jpg, jpeg, png, gif) are allowed");
      }

      const { error: uploadError } = await supabase.storage
        .from("profile_images")
        .upload(`profile_images/${fileName}`, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: storageData } = supabase.storage
        .from("profile_images")
        .getPublicUrl(`profile_images/${fileName}`);
      profileImageUrl = storageData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        firstname: updates.firstname,
        lastname: updates.lastname,
        username: updates.username,
        email: updates.email,
        bio: updates.bio,
        profile_image: profileImageUrl,
      })
      .eq("wallet", wallet);

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error(
      "Error updating user:",
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update user",
    };
  }
};

// Function to delete unreal_token by wallet in user_profiles table
export const deleteUnrealTokenByWallet = async (wallet: string) => {
  try {
    if (!wallet) {
      throw new Error("Wallet address is required");
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ unreal_token: null }) // Set unreal_token to null to "delete" it
      .eq("wallet", wallet); // Match the wallet address

    if (error) {
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error("Error delete unreal_token:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete unreal_token",
    };
  }
};
