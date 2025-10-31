"use server";

import { supabase } from "@/lib/supabase";
import { ChatHistoryType } from "@/utils/types";

// Fetch user's chat history from database, default last 5 chat messages
export const fetchChatHistory = async (
  userId: number,
  limit: number = 5
): Promise<ChatHistoryType[]> => {
  try {
    const { data, error } = await supabase
      .from("chat_history")
      .select("*")
      .eq("user", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Reverse data sorting from oldest to newest
    const sortedData = data ? [...data].reverse() : [];

    return sortedData || [];
  } catch (error) {
    console.error("Fetch chat history error", error);
    throw new Error("Failed to fetch chat history");
  }
};

// Save chat message to Supabase chat_history table
export const saveChatMessage = async (
  userId: number,
  userMessage: string,
  aiResponse: string,
  model: string,
  object: string
): Promise<void> => {
  try {
    const { error } = await supabase.from("chat_history").insert({
      user: userId,
      user_message: userMessage,
      ai_response: aiResponse,
      model,
      object,
    });
    if (error) throw error;
  } catch (error) {
    console.error("Error saving chat history", error);
    throw new Error("Failed to save chat history");
  }
};

// Delete all Chat History by User Id
export const deleteAllChatHistory = async (userId: number): Promise<void> => {
  try {
    if (!userId) throw new Error("User is required");

    const { error } = await supabase
      .from("chat_history")
      .delete()
      .eq("user", userId);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting all chat history", error);
    throw new Error("Failed to delete chat messages");
  }
};
