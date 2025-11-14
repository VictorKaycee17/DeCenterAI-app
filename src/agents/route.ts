import { NextResponse } from "next/server";
import { runAgent } from "@/agents/ai-agent";

export async function POST(req: Request) {
  try {
    const { userId, prompt, apiKey, model } = await req.json();

    if (!prompt || !apiKey) {
      return NextResponse.json(
        { success: false, message: "Missing prompt or API key" },
        { status: 400 }
      );
    }

    // Call AI Agent (→ Unreal API → Hedera → return AI response)
    const aiResponse = await runAgent({
      playgroundPrompt: prompt,
      apiKey,
      model,
    });

    // ✅ Add Cloudflare-required header when proxying
    const unrealResp = await fetch(process.env.UNREAL_API_URL || "https://api.unreal.com/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "User-Agent": "UnrealAI/1.0 (+https://unreal.art)", // <-- Required fix
      },
      body: JSON.stringify({
        model: model || "mixtral-8x22b-instruct",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const unrealJson = await unrealResp.json();

    return NextResponse.json({
      success: true,
      aiResponse,
      unrealResult: unrealJson,
    });
  } catch (error: any) {
    console.error("Agent route error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Agent failed" },
      { status: 500 }
    );
  }
}
