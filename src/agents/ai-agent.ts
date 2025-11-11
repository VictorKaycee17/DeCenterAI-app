#!/usr/bin/env node

import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { MemorySaver, StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { allHederaTools } from "@/tools/hedera-tools";

// ---------------------------
// Unreal API Client
// ---------------------------
const unrealApi = {
  async generate(opts: { prompt: string; model?: string; apiKey?: string }) {
    const url = process.env.UNREAL_API_URL || "https://api.unreal.com/v1/chat";
    const apiKey = opts.apiKey || process.env.UNREAL_API_KEY;
    if (!apiKey) throw new Error("UNREAL_API_KEY is missing");

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: opts.prompt,
        model: opts.model || "mixtral-8x22b-instruct",
      }),
    });

    if (!resp.ok)
      throw new Error(`Unreal API: ${resp.status} ${await resp.text()}`);

    const json = await resp.json();
    return (
      json?.choices?.[0]?.message?.content ??
      json?.output ??
      JSON.stringify(json)
    );
  },
};

// ---------------------------
// LLM Wrapper for LangGraph
// ---------------------------
const llmWrapper = {
  invoke: async (input: any) => {
    const messages = input.messages || [];
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || "";
    
    const text = await unrealApi.generate({
      prompt,
      model: input.model,
      apiKey: input.apiKey,
    });
    
    return new AIMessage({ content: text });
  },
};

// ---------------------------
// Agent Node Functions
// ---------------------------
const callModel = async (state: typeof MessagesAnnotation.State) => {
  const response = await llmWrapper.invoke(state);
  return { messages: [response] };
};

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  
  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage instanceof AIMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  // Otherwise, we stop (reply to the user)
  return END;
};

// ---------------------------
// Create Agent Workflow
// ---------------------------
const toolNode = new ToolNode(allHederaTools);

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

const agent = workflow.compile({
  checkpointer: new MemorySaver(),
});

// ---------------------------
// Main Agent Runner Function
// ---------------------------
export async function runAgent({
  playgroundPrompt,
  hcsTopic,
  topicSubmission,
  apiKey,
  model,
}: {
  playgroundPrompt?: string;
  hcsTopic?: string;
  topicSubmission?: string;
  apiKey?: string;
  model?: string;
}): Promise<string> {
  let systemPrompt = `You are DeCenterAI.
If user requests create or submit to Hedera topics, call the relevant tool.`;

  if (hcsTopic) {
    systemPrompt += `\nUser wants to create a Hedera Consensus Topic.`;
  }

  if (topicSubmission) {
    systemPrompt += `\nUser wants to submit a message to an HCS topic.`;
  }

  const userMessage = playgroundPrompt || hcsTopic || topicSubmission;
  
  if (!userMessage) {
    throw new Error("At least one of playgroundPrompt, hcsTopic, or topicSubmission must be provided");
  }

  const result: any = await agent.invoke(
    { messages: [new HumanMessage(userMessage)] },
    { configurable: { thread_id: "hcs-playground-session" } },
  );

  const last = result?.messages?.[result.messages.length - 1];
  return last?.content || "No response.";
}

// ---------------------------
// CLI Mode (Optional)
// ---------------------------
if (process.argv[1]?.includes("ai-agent.ts")) {
  (async () => {
    console.log("DeCenterAI Agent CLI Started — type and press Enter\n");
    process.stdin.on("data", async (d) => {
      const text = d.toString().trim();
      if (!text) return;
      const out = await runAgent({ playgroundPrompt: text });
      console.log("\nAgent:", out, "\n");
    });
  })();
}
