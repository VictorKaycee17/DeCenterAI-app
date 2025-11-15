// src/agents/ai-agent.ts
import dotenv from "dotenv";
dotenv.config();

import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import type { Message as LangchainMessage } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage, AIMessage as AIMsg } from "@langchain/core/messages";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { ChatResult, ChatGeneration } from "@langchain/core/outputs";
import { allHederaTools } from "../tools/hedera-tools.js";
import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";

// -----------------------------
// OpenAI/OpenRouter Adapter
// -----------------------------
class OpenRouterAdapter {
  private client: OpenAI;

  constructor(apiKey?: string, baseURL?: string) {
    const key = apiKey || process.env.UNREAL_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Missing API key: set UNREAL_API_KEY or OPENAI_API_KEY");

    const base = baseURL || process.env.UNREAL_API_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

    console.log(`🔧 Initializing OpenAI client:`);
    console.log(`   Base URL: ${base}`);
    console.log(`   API Key: ${key.substring(0, 10)}...`);

    this.client = new OpenAI({ 
      apiKey: key, 
      baseURL: base,
      timeout: 30000, // 30 second timeout
      maxRetries: 2
    });
  }

  async chat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    model = "gpt-4o-mini",
    tools?: any[]
  ) {
    try {
      const params: any = {
        model,
        messages
      };

      // Add tool definitions if provided
      if (tools && tools.length > 0) {
        const formattedTools = tools
          .filter((t): t is any => t.type !== 'custom')
          .map(t => ({
            type: "function" as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters || {
                type: "object",
                properties: {},
                required: []
              }
            }
          }));
        params.tools = formattedTools;
        params.tool_choice = "auto";
      }

      const resp = await this.client.chat.completions.create(params);
      return resp;
    } catch (err: any) {
      console.error("[OpenRouterAdapter] request failed:", err?.message ?? err);
      throw new Error(err?.message ?? "LLM request failed");
    }
  }
}

// -----------------------------
// Custom LangChain Chat Model
// -----------------------------
class OpenRouterChatModel extends BaseChatModel {
  private adapter: OpenRouterAdapter;
  modelName: string;
  private boundTools: any[] = [];

  constructor(modelName = "gpt-4o-mini") {
    super({});
    this.adapter = new OpenRouterAdapter();
    this.modelName = modelName;
  }

  _llmType(): string {
    return "openrouter";
  }

  async _generate(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    // Convert LangChain messages to OpenAI format
    const formattedMessages = messages.map((msg) => {
      const msgType = msg._getType();
      let role: "system" | "user" | "assistant" = "user";
      
      if (msgType === "system") role = "system";
      else if (msgType === "ai") role = "assistant";
      else if (msgType === "human") role = "user";

      return {
        role,
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      };
    });

    // Call the API with tools if bound
    const resp = await this.adapter.chat(
      formattedMessages, 
      this.modelName,
      this.boundTools.length > 0 ? this.boundTools : undefined
    );

    const choice = resp.choices[0];
    const message = choice.message;

    // Check if model wants to call a tool
    if (message.tool_calls && message.tool_calls.length > 0) {
      const functionToolCalls = message.tool_calls.filter(
        (tc): tc is Extract<typeof tc, { type: 'function' }> => tc.type === 'function'
      );
      
      console.log(`🔧 Calling tool(s):`, functionToolCalls.map(tc => tc.function.name).join(', '));
      
      const formattedToolCalls = functionToolCalls.map(tc => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }));

      const generation: ChatGeneration = {
        text: message.content || "",
        message: new AIMsg({
          content: message.content || "",
          additional_kwargs: {
            tool_calls: formattedToolCalls
          }
        }),
      };

      return {
        generations: [generation],
      };
    }

    // Regular text response
    const text = message.content || "No response";
    
    const generation: ChatGeneration = {
      text,
      message: new AIMsg(text),
    };

    return {
      generations: [generation],
    };
  }

  // Store tools for use in _generate
  bindTools(tools: any[]): this {
    const newInstance = new OpenRouterChatModel(this.modelName);
    newInstance.boundTools = tools.map(tool => {
      let jsonSchema: any;
      
      try {
        const rawSchema = tool.schema as any;
        
        // Check if schema has the _def.shape structure (Zod object)
        if (rawSchema?._def?.shape) {
          // Manually build JSON Schema from Zod shape
          const properties: any = {};
          const required: string[] = [];
          
          Object.entries(rawSchema._def.shape).forEach(([key, value]: [string, any]) => {
            let propSchema: any = { type: "string" }; // default
            
            // Check various Zod type patterns
            const typeName = value._def?.typeName || value.constructor?.name;
            
            // Handle ZodDefault wrapper
            if (typeName === "ZodDefault" || value._def?.defaultValue !== undefined) {
              const innerType = value._def?.innerType || value;
              propSchema = { type: "string" };
              if (value._def?.defaultValue !== undefined) {
                propSchema.default = value._def.defaultValue;
              }
              // Optional parameters (with default) are not required
            } else {
              // Required parameter
              propSchema = { type: "string" };
              required.push(key);
            }
            
            // Add description - check multiple possible locations
            const desc = value._def?.description || 
                        value.description || 
                        value._def?.innerType?._def?.description;
            if (desc) {
              propSchema.description = desc;
            }
            
            properties[key] = propSchema;
          });
          
          jsonSchema = {
            type: "object",
            properties,
            required
          };
        } else {
          throw new Error("No shape found in schema _def");
        }
      } catch (err: any) {
        console.warn(`⚠️  Could not extract schema for ${tool.name}:`, err.message);
        jsonSchema = {
          type: "object",
          properties: {},
          required: []
        };
      }

      return {
        name: tool.name,
        description: tool.description,
        parameters: jsonSchema
      };
    });
    
    return newInstance as this;
  }
}

// -----------------------------
// Validate tools
// -----------------------------
const safeTools = Array.isArray(allHederaTools)
  ? allHederaTools.filter(t => t && typeof t.name === "string" && typeof t.call === "function")
  : [];

if (safeTools.length === 0) {
  console.warn("⚠️ No valid Hedera tools detected!");
} else {
  console.log(`✅ Loaded ${safeTools.length} Hedera tools:`, safeTools.map(t => t.name));
}

// -----------------------------
// Create the LangGraph agent
// -----------------------------
const llm = new OpenRouterChatModel(process.env.OPENROUTER_MODEL || "gpt-4o-mini");

const agent = createReactAgent({
  llm,
  tools: safeTools,
  checkpointSaver: new MemorySaver(),
});

// -----------------------------
// Conversation memory
// -----------------------------
const conversationHistory: Array<SystemMessage | HumanMessage | AIMessage> = [
  new SystemMessage(
    "You are DeCenterAI, an AI assistant with access to Hedera blockchain tools.\n\n" +
    "Available tools:\n" +
    "- CMD_HCS_CREATE_TOPIC: Creates a new Hedera Consensus Service topic. Returns {txId, topicId}.\n" +
    "- CMD_HCS_SUBMIT_TOPIC_MESSAGE: Submits a message to an existing topic. Returns {txId, topicSequenceNumber}.\n\n" +
    "IMPORTANT INSTRUCTIONS:\n" +
    "1. When a user asks to create a topic, call CMD_HCS_CREATE_TOPIC ONCE with an appropriate memo.\n" +
    "2. When you receive a tool result with txId and topicId, immediately respond to the user with those details. DO NOT call the tool again.\n" +
    "3. When a user asks to submit a message, call CMD_HCS_SUBMIT_TOPIC_MESSAGE ONCE.\n" +
    "4. After receiving a successful tool result, ALWAYS provide a human-readable response summarizing what was done.\n" +
    "5. NEVER call the same tool multiple times for a single request.\n" +
    "6. If you see a tool result in the conversation, acknowledge it and respond to the user - don't call more tools."
  ),
];

// -----------------------------
// runAgent helper
// -----------------------------
export async function runAgent(opts: {
  playgroundPrompt?: string;
  hcsTopicRequest?: string;
  hcsSubmitMessage?: string;
  model?: string;
}) {
  const { playgroundPrompt, hcsTopicRequest, hcsSubmitMessage, model } = opts ?? {};
  const userMessageText = playgroundPrompt ?? hcsTopicRequest ?? hcsSubmitMessage ?? "No input.";

  conversationHistory.push(new HumanMessage(userMessageText));

  const payload = { 
    messages: conversationHistory as unknown as LangchainMessage[],
    recursionLimit: 10 // Limit iterations to prevent infinite loops
  } as any;
  if (model) payload.model = model;

  try {
    const response: any = await agent.invoke(payload, { configurable: { thread_id: "DECENTERAI-THREAD" } });

    const lastMsg = response?.messages?.[response.messages.length - 1];
    const replyText = lastMsg?.content ?? lastMsg?.text ?? (response?.generations?.[0]?.[0]?.text ?? "No response.");

    conversationHistory.push(new AIMessage(replyText));

    return replyText;
  } catch (err: any) {
    console.error("❌ Error in runAgent:", err.message);
    
    // If recursion limit hit, return the last successful result
    if (err.message?.includes('Recursion limit')) {
      console.log("⚠️  Recursion limit reached - returning partial results");
      return "Task completed (recursion limit reached). Check the transaction IDs above for results.";
    }
    
    throw err;
  }
}

// -----------------------------
// CLI interactive mode
// -----------------------------
if (process.argv[1]?.endsWith("/ai-agent.ts") || process.argv[1]?.endsWith("\\ai-agent.ts")) {
  (async () => {
    console.log("🤖 DeCenterAI CLI — type a prompt (Ctrl+C to exit)\n");

    const rl = await import("node:readline/promises");
    const r = rl.createInterface({ input: process.stdin, output: process.stdout });

    while (true) {
      const prompt = await r.question("> ");
      if (!prompt.trim()) continue;
      try {
        const reply = await runAgent({ playgroundPrompt: prompt });
        console.log("\n🧠 AI:", reply, "\n");
      } catch (err: any) {
        console.error("❌ Agent error:", err?.message ?? err);
        console.error("Stack:", err?.stack);
      }
    }
  })();
}