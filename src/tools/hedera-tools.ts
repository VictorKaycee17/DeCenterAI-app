// src/tools/hedera-tools.ts
import { TopicCreateTransaction, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { createInstance } from "../api/hedera-client";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ---------------------
// ✅ Lazy Hedera Client
// createInstance() is NOT called at module load time.
// It is deferred to the first actual tool invocation so that
// the Hedera SDK never runs during Next.js build/page-data collection.
// ---------------------
let _hederaClient: ReturnType<typeof createInstance> | null = null;

function getHederaClient(): ReturnType<typeof createInstance> {
  if (!_hederaClient) {
    _hederaClient = createInstance();
  }
  return _hederaClient;
}

// ---------------------
// Create Topic Tool
// ---------------------
export const commandHcsCreateTopicTool = tool(
  async ({ memo }: { memo: string }) => {
    // ✅ Client obtained lazily inside the handler
    const hederaClient = getHederaClient();
    try {
      const tx = await new TopicCreateTransaction()
        .setTopicMemo(memo)
        .freezeWith(hederaClient);
      const signed = await tx.signWithOperator(hederaClient);
      const submitted = await signed.execute(hederaClient);
      const receipt = await submitted.getReceipt(hederaClient);

      if (!receipt.topicId) throw new Error("No topicId returned");

      return JSON.stringify({
        txId: submitted.transactionId.toString(),
        topicId: receipt.topicId.toString(),
      });
    } catch (err: any) {
      console.error("Error creating topic:", err.message);
      throw new Error(`Failed to create topic: ${err.message}`);
    }
  },
  {
    name: "CMD_HCS_CREATE_TOPIC",
    description: "Create a new Hedera Consensus Service topic with an optional memo",
    schema: z.object({
      memo: z
        .string()
        .describe("A memo/description for the topic (optional, can be empty string)")
        .default(""),
    }),
  }
);

// ---------------------
// Submit Message Tool
// ---------------------
export const commandHcsSubmitTopicMessageTool = tool(
  async ({ topicId, message }: { topicId: string; message: string }) => {
    // ✅ Client obtained lazily inside the handler
    const hederaClient = getHederaClient();
    try {
      const tx = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message)
        .freezeWith(hederaClient);
      const signed = await tx.signWithOperator(hederaClient);
      const submitted = await signed.execute(hederaClient);
      const receipt = await submitted.getReceipt(hederaClient);

      return JSON.stringify({
        txId: submitted.transactionId.toString(),
        topicSequenceNumber: receipt.topicSequenceNumber?.toString(),
      });
    } catch (err: any) {
      console.error("Error submitting topic message:", err.message);
      throw new Error(`Failed to submit topic message: ${err.message}`);
    }
  },
  {
    name: "CMD_HCS_SUBMIT_TOPIC_MESSAGE",
    description: "Submit a message to an existing HCS topic",
    schema: z.object({
      topicId: z.string().describe("The Hedera topic ID (format: 0.0.xxxxx)"),
      message: z.string().describe("The message content to submit to the topic"),
    }),
  }
);

// ---------------------
// Export all tools
// ---------------------
export const allHederaTools = [
  commandHcsCreateTopicTool,
  commandHcsSubmitTopicMessageTool,
];