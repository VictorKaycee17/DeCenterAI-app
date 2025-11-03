"use server";

import { unrealApiUrl } from "@/utils/config";
import { ChatCompletionResponse } from "@/utils/types";

// Request a chat completion from Unreal API
export const getChatCompletion = async (
  token: string,
  model: string,
  message: string
): Promise<ChatCompletionResponse> => {
  try {
    console.debug("Request chat completion", token, model, message);

    const response = await fetch(`${unrealApiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: `unreal::${model}`,
        messages: [{ role: "user", content: message }],
        stream: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = data.error || "Failed to get chat completion";

      if (data.price) {
        errorMessage += `: Insufficient funds, requires at least ${data.price}`;
      }

      console.error("Error getting chat completion", data);
      throw new Error(errorMessage);
    }

    console.debug("Chat completion response data", data);

    return data as ChatCompletionResponse;
  } catch (error) {
    console.error("Error getting chat completion:", error);
    throw new Error(
      error instanceof Error ? error.message : "Chat completion failed"
    );
  }
};
