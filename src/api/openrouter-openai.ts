import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

/** ✅ Define config type */
export interface OpenRouterLLMConfig {
  modelName?: string;
  baseURL?: string;
  apiKey?: string;
  llmType?: string; // e.g., "openai"
}

/** ✅ Fully typed instance creator */
export function createInstance(params: OpenRouterLLMConfig = {}) {
  let { modelName, baseURL, apiKey, llmType } = params;

  modelName = modelName || process.env.OPENROUTER_MODEL!;
  baseURL = baseURL || process.env.OPENROUTER_BASE_URL!;
  apiKey = apiKey || process.env.OPENROUTER_API_KEY!;
  llmType = llmType || modelName.split("/")[0];

  console.log("openRouter openAI createInstance", {
    modelName,
    baseURL,
    apiKey: apiKey ? apiKey.substring(0, 12) + "..." : "undefined",
    llmType,
  });

  if (!apiKey) {
    throw new Error("Missing API key: OPENROUTER_API_KEY must be set in .env");
  }

  switch (llmType) {
    case "openai":
      return new ChatOpenAI({
        modelName,
        apiKey,
        modalities: ["text"],
        maxTokens: 1000,
        temperature: 0.9,
        configuration: {
          baseURL,
        },
      });

    default:
      throw new Error(`Unsupported LLM type: ${llmType}`);
  }
}
