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

    const base = baseURL || process.env.UNREAL_API_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions";

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
        messages,
      };

      // Add tool definitions if provided
      if (tools && tools.length > 0) {
        console.log(`🔧 Sending ${tools.length} tools to API`);
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

      console.log(`🌐 Calling OpenAI API (model: ${model})...`);
      console.log(`📍 Base URL: ${this.client.baseURL}`);
      console.log(`🔑 Has API key: ${!!this.client.apiKey}`);
      
      // Test with a simple request first
      const testParams = {
        model,
        messages: [{ role: "user" as const, content: "Say 'test'" }],
        max_tokens: 10
      };
      
      console.log(`🧪 Testing basic API call first...`);
      try {
        const testResp = await this.client.chat.completions.create(testParams);
        console.log(`✅ Basic API test successful:`, testResp.choices[0].message.content);
      } catch (testErr: any) {
        console.error(`❌ Basic API test failed:`, testErr.message);
        throw testErr;
      }
      
      console.log(`📤 Now making full request with ${messages.length} messages...`);
      const resp = await this.client.chat.completions.create(params);
      console.log(`✅ Got response from API`);
      return resp;
    } catch (err: any) {
      console.error("[OpenRouterAdapter] request failed:", err?.message ?? err);
      console.error("[OpenRouterAdapter] status:", err?.status);
      console.error("[OpenRouterAdapter] response:", err?.response?.data);
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
    console.log(`\n🤖 _generate called with ${messages.length} messages`);
    
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

    console.log(`📨 Formatted messages:`, formattedMessages.map(m => `${m.role}: ${m.content.substring(0, 50)}...`));

    // Call the API with tools if bound
    const resp = await this.adapter.chat(
      formattedMessages, 
      this.modelName,
      this.boundTools.length > 0 ? this.boundTools : undefined
    );

    const choice = resp.choices[0];
    const message = choice.message;

    console.log(`📥 Response:`, { 
      hasToolCalls: !!message.tool_calls,
      toolCallsLength: message.tool_calls?.length || 0,
      content: message.content?.substring(0, 100) 
    });

    // Check if model wants to call a tool
    if (message.tool_calls && message.tool_calls.length > 0) {
      const functionToolCalls = message.tool_calls.filter(
        (tc): tc is Extract<typeof tc, { type: 'function' }> => tc.type === 'function'
      );
      
      console.log(`🔧 Model wants to call ${functionToolCalls.length} tool(s):`, 
        functionToolCalls.map(tc => tc.function.name)
      );
      
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
    console.log(`💬 Returning text response`);
    
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
    "You are DeCenterAI, an AI assistant with access to Hedera blockchain tools. " +
    "When users ask to create topics or submit messages to Hedera, use your tools. " +
    "Available tools: CMD_HCS_CREATE_TOPIC (creates a new topic) and CMD_HCS_SUBMIT_TOPIC_MESSAGE (submits message to existing topic)."
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

  const payload = { messages: conversationHistory as unknown as LangchainMessage[] } as any;
  if (model) payload.model = model;

  try {
    const response: any = await agent.invoke(payload, { configurable: { thread_id: "DECENTERAI-THREAD" } });

    console.log("\n📦 Full response:", JSON.stringify(response, null, 2));

    const lastMsg = response?.messages?.[response.messages.length - 1];
    const replyText = lastMsg?.content ?? lastMsg?.text ?? (response?.generations?.[0]?.[0]?.text ?? "No response.");

    conversationHistory.push(new AIMessage(replyText));

    return replyText;
  } catch (err: any) {
    console.error("❌ Error in runAgent:", err.message);
    console.error("Stack:", err.stack);
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