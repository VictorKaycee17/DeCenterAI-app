// src/agents/ai-agent.ts
import dotenv from "dotenv";
dotenv.config();

// Suppress LangChain deprecation warnings
process.env.LANGCHAIN_SUPPRESS_WARNINGS = "true";
process.env.LANGCHAIN_TRACING_V2 = "false";

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args.join(" ");
  if (
    message.includes("LangChain packages are available") ||
    message.includes("Please upgrade your packages")
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import type { Message as LangchainMessage } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage, AIMessage as AIMsg } from "@langchain/core/messages";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { ChatResult, ChatGeneration } from "@langchain/core/outputs";
import { allHederaTools } from "@/tools/hedera-tools";
import OpenAI from "openai";

// -----------------------------
// OpenAI/Unreal API Adapter
// -----------------------------
class OpenRouterAdapter {
  private client: OpenAI;

  constructor(apiKey?: string, baseURL?: string) {
    const key = apiKey || process.env.UNREAL_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Missing API key: set UNREAL_API_KEY or OPENAI_API_KEY");

    const base =
      baseURL ||
      process.env.UNREAL_API_URL ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1";

    console.log(`🔗 Initializing OpenAI client with baseURL: ${base}`);

    this.client = new OpenAI({
      apiKey: key,
      baseURL: base,
      timeout: 30000,
      maxRetries: 2,
    });
  }

  async chat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    model = "gpt-4o-mini",
    tools?: any[]
  ) {
    try {
      const params: any = { model, messages };

      if (tools && tools.length > 0) {
        const formattedTools = tools
          .filter((t): t is any => t.type !== "custom")
          .map((t) => ({
            type: "function" as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters || {
                type: "object",
                properties: {},
                required: [],
              },
            },
          }));
        params.tools = formattedTools;
        params.tool_choice = "auto";
        params.parallel_tool_calls = false;
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
  // ✅ Adapter is created per-request with the provided apiKey,
  //    never cached as a singleton so key changes take effect immediately
  private apiKey: string | undefined;
  modelName: string;
  private boundTools: any[] = [];

  constructor(modelName = "gpt-4o-mini", apiKey?: string) {
    super({});
    this.modelName = modelName;
    this.apiKey = apiKey;
  }

  // ✅ Fresh adapter each time — ensures the correct apiKey is always used
  private getAdapter(): OpenRouterAdapter {
    return new OpenRouterAdapter(this.apiKey);
  }

  _llmType(): string {
    return "openrouter";
  }

  async _generate(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    const formattedMessages = messages.map((msg) => {
      const msgType = msg._getType();
      let role: "system" | "user" | "assistant" = "user";
      if (msgType === "system") role = "system";
      else if (msgType === "ai") role = "assistant";
      else if (msgType === "human") role = "user";

      return {
        role,
        content:
          typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      };
    });

    const resp = await this.getAdapter().chat(
      formattedMessages,
      this.modelName,
      this.boundTools.length > 0 ? this.boundTools : undefined
    );

    const choice = resp.choices[0];
    const message = choice.message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      const functionToolCalls = message.tool_calls.filter(
        (tc): tc is Extract<typeof tc, { type: "function" }> => tc.type === "function"
      );

      console.log(
        `🔧 Model requesting ${functionToolCalls.length} tool call(s):`,
        functionToolCalls.map((tc) => tc.function.name).join(", ")
      );

      const formattedToolCalls = functionToolCalls.map((tc) => {
        console.log(`  📞 ${tc.function.name}(${tc.function.arguments})`);
        return {
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        };
      });

      const generation: ChatGeneration = {
        text: message.content || "",
        message: new AIMsg({
          content: message.content || "",
          additional_kwargs: { tool_calls: formattedToolCalls },
        }),
      };

      return { generations: [generation] };
    }

    const text = message.content || "No response";
    return {
      generations: [{ text, message: new AIMsg(text) }],
    };
  }

  bindTools(tools: any[]): this {
    const newInstance = new OpenRouterChatModel(this.modelName, this.apiKey);
    newInstance.boundTools = tools.map((tool) => {
      let jsonSchema: any;

      try {
        const rawSchema = tool.schema as any;

        if (rawSchema?._def?.shape) {
          const properties: any = {};
          const required: string[] = [];

          Object.entries(rawSchema._def.shape).forEach(
            ([key, value]: [string, any]) => {
              const typeName = value._def?.typeName || value.constructor?.name;
              let propSchema: any = { type: "string" };

              if (typeName === "ZodDefault" || value._def?.defaultValue !== undefined) {
                propSchema = { type: "string" };
                if (value._def?.defaultValue !== undefined) {
                  propSchema.default = value._def.defaultValue;
                }
              } else {
                propSchema = { type: "string" };
                required.push(key);
              }

              const desc =
                value._def?.description ||
                value.description ||
                value._def?.innerType?._def?.description;
              if (desc) propSchema.description = desc;

              properties[key] = propSchema;
            }
          );

          jsonSchema = { type: "object", properties, required };
        } else {
          throw new Error("No shape found in schema _def");
        }
      } catch (err: any) {
        console.warn(`⚠️  Could not extract schema for ${tool.name}:`, err.message);
        jsonSchema = { type: "object", properties: {}, required: [] };
      }

      return {
        name: tool.name,
        description: tool.description,
        parameters: jsonSchema,
      };
    });

    return newInstance as this;
  }
}

// -----------------------------
// Validate tools
// -----------------------------
const safeTools = Array.isArray(allHederaTools)
  ? allHederaTools.filter(
      (t) => t && typeof t.name === "string" && typeof t.call === "function"
    )
  : [];

if (safeTools.length === 0) {
  console.warn("⚠️ No valid Hedera tools detected!");
} else {
  console.log(`✅ Loaded ${safeTools.length} Hedera tools:`, safeTools.map((t) => t.name));
}

// -----------------------------
// ✅ Agent factory — one agent per apiKey so auth is always fresh
// -----------------------------
const agentCache = new Map<string, ReturnType<typeof createReactAgent>>();

function getAgent(apiKey?: string) {
  // Use a cache key so we reuse agents for the same key (perf),
  // but always create a new one for a new/different key (correctness)
  const cacheKey = apiKey || "__env__";

  if (!agentCache.has(cacheKey)) {
    const llm = new OpenRouterChatModel(
      process.env.OPENROUTER_MODEL || "gpt-4o-mini",
      apiKey // ✅ key is wired through to the adapter
    );
    const newAgent = createReactAgent({
      llm,
      tools: safeTools,
      checkpointSaver: new MemorySaver(),
    });
    agentCache.set(cacheKey, newAgent);
    console.log(`🤖 Agent initialized for key: ${cacheKey.substring(0, 8)}...`);
  }

  return agentCache.get(cacheKey)!;
}

// -----------------------------
// Session management
// -----------------------------
const sessionHistories = new Map<
  string,
  Array<SystemMessage | HumanMessage | AIMessage>
>();
const sessionTopics = new Map<string, string>();

function getConversationHistory(sessionId: string) {
  if (!sessionHistories.has(sessionId)) {
    sessionHistories.set(sessionId, [
      new SystemMessage(
        "You are DeCenterAI, a helpful AI assistant with Hedera blockchain integration.\n\n" +
          "Tools available:\n" +
          "1. CMD_HCS_CREATE_TOPIC: Creates a topic, returns JSON: {\"txId\": \"...\", \"topicId\": \"0.0.xxxxx\"}\n" +
          "2. CMD_HCS_SUBMIT_TOPIC_MESSAGE: Submits message to a topic (requires topicId and message)\n\n" +
          "WORKFLOW:\n" +
          "- You can ONLY call ONE tool at a time\n" +
          "- When user sends a message:\n" +
          "  1. If no topic exists: Create one with CMD_HCS_CREATE_TOPIC\n" +
          "  2. Submit the message with CMD_HCS_SUBMIT_TOPIC_MESSAGE\n" +
          "  3. THEN answer the user's question naturally and helpfully\n" +
          "- You are a conversational assistant - engage with users, answer their questions, and be helpful\n" +
          "- The Hedera submission is just for record-keeping; your main job is to assist the user\n\n" +
          "Example:\n" +
          "User: 'What's 2+2?'\n" +
          "You: [submit to Hedera] then respond: 'I've recorded your message. The answer is 4!'"
      ),
    ]);
  }
  return sessionHistories.get(sessionId)!;
}

function getSessionTopic(sessionId: string): string | null {
  return sessionTopics.get(sessionId) || null;
}

function setSessionTopic(sessionId: string, topicId: string) {
  sessionTopics.set(sessionId, topicId);
  console.log(`💾 Saved topic ${topicId} for session ${sessionId}`);
}

// -----------------------------
// runAgent helper
// -----------------------------
export async function runAgent(opts: {
  playgroundPrompt?: string;
  hcsTopicRequest?: string;
  hcsSubmitMessage?: string;
  model?: string;
  sessionId?: string;
  apiKey?: string; // ✅ new — forwarded from route.ts
  autoCreateTopic?: boolean;
}) {
  const {
    playgroundPrompt,
    hcsTopicRequest,
    hcsSubmitMessage,
    model,
    sessionId = "default",
    apiKey,
    autoCreateTopic = true,
  } = opts ?? {};

  const userMessageText =
    playgroundPrompt ?? hcsTopicRequest ?? hcsSubmitMessage ?? "No input.";

  const conversationHistory = getConversationHistory(sessionId);
  const existingTopic = getSessionTopic(sessionId);

  if (autoCreateTopic && !existingTopic) {
    console.log(`📝 No topic for session ${sessionId}, will create automatically`);
    conversationHistory.push(
      new HumanMessage(
        `[SYSTEM CONTEXT: No topic exists yet. First use CMD_HCS_CREATE_TOPIC with memo="Auto-created for session ${sessionId}", ` +
          `then use CMD_HCS_SUBMIT_TOPIC_MESSAGE with the user's message below.]\n\n` +
          `User message: ${userMessageText}`
      )
    );
  } else if (existingTopic) {
    console.log(`📋 Using topic ${existingTopic} for session ${sessionId}`);
    conversationHistory.push(
      new HumanMessage(
        `[SYSTEM CONTEXT: Use existing topic ${existingTopic}. Call CMD_HCS_SUBMIT_TOPIC_MESSAGE with topicId="${existingTopic}"]\n\n` +
          `User message: ${userMessageText}`
      )
    );
  } else {
    conversationHistory.push(new HumanMessage(userMessageText));
  }

  const payload = {
    messages: conversationHistory as unknown as LangchainMessage[],
  } as any;
  if (model) payload.model = model;

  try {
    // ✅ getAgent(apiKey) ensures the right key is used for this request
    const response: any = await getAgent(apiKey).invoke(payload, {
      configurable: { thread_id: `DECENTERAI-${sessionId}` },
      recursionLimit: 10,
    });

    console.log("\n📦 Agent response summary:");
    console.log(`  Messages: ${response?.messages?.length || 0}`);

    const lastMsg = response?.messages?.[response.messages.length - 1];
    const replyText =
      lastMsg?.content ??
      lastMsg?.text ??
      "Task completed. Check logs for details.";

    // Extract and save topicId if this was a new topic
    if (!existingTopic && response?.messages) {
      for (const msg of response.messages) {
        if (msg._getType && msg._getType() === "tool") {
          const content =
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content);

          try {
            const parsed = JSON.parse(content);
            if (parsed.topicId) {
              setSessionTopic(sessionId, parsed.topicId);
              console.log(`✅ Topic created: ${parsed.topicId}`);
              break;
            }
          } catch (e) {
            const match = content.match(/"topicId"\s*:\s*"(0\.0\.\d+)"/);
            if (match) {
              setSessionTopic(sessionId, match[1]);
              console.log(`✅ Topic created: ${match[1]}`);
              break;
            }
          }
        }
      }
    }

    conversationHistory.push(new AIMessage(replyText));
    return replyText;
  } catch (err: any) {
    console.error("❌ Error in runAgent:", err.message);

    if (
      err.message?.includes("Recursion limit") ||
      err.message?.includes("maximum iterations")
    ) {
      return "I completed the task but hit the iteration limit. The topic and message should be created. Check the logs above for transaction IDs.";
    }

    throw err;
  }
}

// -----------------------------
// CLI interactive mode
// -----------------------------
const isRunningDirectly = process.argv[1]?.includes("ai-agent");

if (isRunningDirectly) {
  (async () => {
    console.log("🤖 DeCenterAI CLI — type a prompt (Ctrl+C to exit)");
    console.log("💡 Commands: 'topic' (show current topic), 'clear' (new session), 'exit'\n");

    const rl = await import("node:readline/promises");
    const r = rl.createInterface({ input: process.stdin, output: process.stdout });
    const cliSessionId = "cli-" + Date.now();

    while (true) {
      const prompt = await r.question("> ");
      if (!prompt.trim()) continue;

      if (prompt.toLowerCase() === "clear") {
        sessionHistories.delete(cliSessionId);
        sessionTopics.delete(cliSessionId);
        console.log("🗑️  Session cleared\n");
        continue;
      }

      if (prompt.toLowerCase() === "topic") {
        const topic = getSessionTopic(cliSessionId);
        console.log(topic ? `📋 Current topic: ${topic}\n` : "❌ No topic yet\n");
        continue;
      }

      if (prompt.toLowerCase() === "exit" || prompt.toLowerCase() === "quit") {
        console.log("👋 Goodbye!");
        process.exit(0);
      }

      try {
        const reply = await runAgent({
          playgroundPrompt: prompt,
          sessionId: cliSessionId,
          autoCreateTopic: true,
        });
        console.log("\n🧠 AI:", reply, "\n");
        if (process.stdout.write("")) {
          process.stdout.once("drain", () => {});
        }
      } catch (err: any) {
        console.error("❌ Agent error:", err?.message ?? err);
      }
    }
  })();
}

export { OpenRouterChatModel, OpenRouterAdapter, getSessionTopic, setSessionTopic };