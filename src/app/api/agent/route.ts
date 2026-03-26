// app/api/agent/route.ts

// ✅ Prevents Next.js from pre-rendering this route at build time
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
// ✅ ai-agent is NOT imported at the top level — dynamically imported inside
// each handler so module-level code never runs during Next.js build.

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

    // ✅ Dynamic import — only runs at request time, never at build time
    const { runAgent, getSessionTopic } = await import("@/agents/ai-agent");

    const sessionId = userId.toString();

    // Check if topic exists for this user
    const existingTopic = getSessionTopic(sessionId);

    // ✅ Pass apiKey directly into runAgent — avoids env mutation which
    //    doesn't work with the lazy singleton adapter pattern
    const aiResponse = await runAgent({
      playgroundPrompt: prompt,
      model: model || "gpt-4o-mini",
      sessionId,
      apiKey,
      autoCreateTopic: true,
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
  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  if (userId) {
    // ✅ Dynamic import — consistent, safe at build time
    const { getSessionTopic } = await import("@/agents/ai-agent");
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
      "CMD_HCS_SUBMIT_TOPIC_MESSAGE - Submit messages to topics",
    ],
  });
}