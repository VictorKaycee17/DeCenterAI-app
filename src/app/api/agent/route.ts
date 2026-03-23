// app/api/agent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { runAgent, getSessionTopic } from "@/agents/ai-agent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, apiKey, model, prompt } = body;

    // Validate inputs
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing userId" },
        { status: 400 }
      );
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, message: "Missing prompt" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "Missing API key" },
        { status: 400 }
      );
    }

    // Temporarily set the API key for this request
    const originalKey = process.env.UNREAL_API_KEY;
    process.env.UNREAL_API_KEY = apiKey;

    try {
      const sessionId = userId.toString();
      
      // Check if topic exists for this user
      const existingTopic = getSessionTopic(sessionId);
      
      // Call the agent with auto-create enabled
      const aiResponse = await runAgent({
        playgroundPrompt: prompt,
        model: model || "gpt-4o-mini",
        sessionId,
        autoCreateTopic: true, // Automatically handle topic creation
      });

      // Get the topic (might be newly created)
      const currentTopic = getSessionTopic(sessionId);

      return NextResponse.json({
        success: true,
        aiResponse,
        topicId: currentTopic,
        isNewTopic: !existingTopic && !!currentTopic,
        object: "chat.completion",
        model: model || "gpt-4o-mini",
      });
    } finally {
      // Restore original API key
      if (originalKey) {
        process.env.UNREAL_API_KEY = originalKey;
      } else {
        delete process.env.UNREAL_API_KEY;
      }
    }
  } catch (error: any) {
    console.error("Agent API error:", error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Agent request failed",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Optional: Get topic for a specific user
  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  
  if (userId) {
    const topic = getSessionTopic(userId);
    return NextResponse.json({
      success: true,
      userId,
      topicId: topic || null,
      hasTopic: !!topic,
    });
  }

  return NextResponse.json({
    success: true,
    message: "DeCenterAI Agent API is running",
    version: "1.0.0",
    features: ["Auto topic creation", "Message submission"],
    tools: [
      "CMD_HCS_CREATE_TOPIC - Create Hedera topics",
      "CMD_HCS_SUBMIT_TOPIC_MESSAGE - Submit messages to topics"
    ],
  });
}