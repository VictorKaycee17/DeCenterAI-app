"use client";

import { getUserByWallet } from "@/actions/supabase/users";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { models } from "@/utils/models";
import TokenInvalidMessage from "@/components/messages/TokenInvalidMessage";
import { verifyUnrealSessionToken } from "@/actions/unreal/auth";
import Spinner from "@/components/ui/icons/Spinner";
import {
  deleteAllChatHistory,
  fetchChatHistory,
  saveChatMessage,
} from "@/actions/supabase/chat_history";
import { getChatCompletion } from "@/actions/unreal/chat";
import { getApiKeysByUser } from "@/actions/supabase/api_keys";
import { BinIcon } from "@/components/ui/icons";

interface ChatMessage {
  id: number;
  user_message: string;
  ai_response: string;
  model: string;
  created_at: string;
}

interface ApiKey {
  id: number;
  api_name: string;
  api_key: string;
}

function extractModelName(modelPath: string): string {
  const match = modelPath.match(/models\/([^/]+)/);
  return match ? match[1] : "AI";
}

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [unrealToken, setUnrealToken] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("mixtral-8x22b-instruct");
  const [isUnrealTokenValid, setIsUnrealTokenValid] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const userAccount = useActiveAccount();
  const userWallet = useActiveWallet();

  // --- Fetch user info and chat history ---
  const fetchUser = async () => {
    if (!userAccount?.address) return;

    try {
      const userRes = await getUserByWallet(userAccount.address);
      if (!userRes.success || !userRes.data)
        throw new Error("Failed to fetch user data");

      const { id, unreal_token } = userRes.data;
      setUserId(id);
      setUnrealToken(unreal_token);

      if (unreal_token) {
        const verifyRes = await verifyUnrealSessionToken(unreal_token);
        setIsUnrealTokenValid(verifyRes.success);
      } else setIsUnrealTokenValid(false);

      const history = await fetchChatHistory(id, 5);
      setMessages(history);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load user or chat history");
    }
  };

  // --- Fetch API Keys ---
  const fetchApiKeys = async (userId: number) => {
    try {
      const apiKeysRes = await getApiKeysByUser(userId);
      if (!apiKeysRes.success) throw new Error("Failed to fetch API keys");

      const keys = apiKeysRes.data || [];
      setApiKeys(keys);
      setSelectedApiKey(keys[0]?.api_key || unrealToken || "");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch API keys");
    }
  };

  // --- Send Message to Unreal API ---
  const handleSendMessage = async () => {
    if (!input.trim() || !selectedApiKey) {
      toast.error("Invalid input or missing API key");
      return;
    }

    setLoading(true);
    try {
      const data = await getChatCompletion(
        selectedApiKey,
        selectedModel,
        input
      );
      const aiResponse = data.choices?.[0]?.message?.content || "No response";

      await saveChatMessage(
        userId!,
        input,
        aiResponse,
        data.model || selectedModel,
        data.object || "chat.completion"
      );

      setInput("");
      const history = await fetchChatHistory(userId!, 5);
      setMessages(history);
    } catch (err) {
      console.error(err);
      toast.error("Failed to get AI response");
    } finally {
      setLoading(false);
    }
  };

  // --- Clear Chat History ---
  const handleClear = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await deleteAllChatHistory(userId);
      setMessages([]);
      toast.info("Chat history cleared");
    } catch (err) {
      toast.error("Failed to clear chat history");
    } finally {
      setLoading(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    fetchUser();
  }, [userAccount]);

  useEffect(() => {
    if (userId) fetchApiKeys(userId);
  }, [userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- UI ---
  return (
    <div className="flex-1 bg-[#050505] min-h-screen">
      {!isUnrealTokenValid && (
        <TokenInvalidMessage
          account={userAccount}
          chainId={userWallet?.getChain()?.id}
          onRefreshSuccess={fetchUser}
        />
      )}

      <div className="flex flex-col gap-6 p-4 sm:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-[#050505] border border-[#232323] rounded-2xl">
          <h1 className="text-[#F5F5F5] text-2xl font-normal">Playground</h1>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-[#C1C1C1] text-sm">Model:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="h-10 px-3 bg-[#191919] border border-[#232323] rounded-[14px] text-[#8F8F8F] text-sm focus:border-[#494949] outline-none"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[#C1C1C1] text-sm">API Key:</label>
              <select
                value={selectedApiKey}
                onChange={(e) => setSelectedApiKey(e.target.value)}
                className="h-10 px-3 bg-[#191919] border border-[#232323] rounded-[14px] text-[#8F8F8F] text-sm focus:border-[#494949] outline-none max-w-[180px]"
              >
                {apiKeys.length > 0 ? (
                  apiKeys.map((key) => (
                    <option key={key.id} value={key.api_key}>
                      {key.api_name}
                    </option>
                  ))
                ) : (
                  <option value={unrealToken || ""}>Session Token</option>
                )}
              </select>
            </div>

            <button
              onClick={handleClear}
              className="flex items-center gap-2 border border-[#232323] px-4 py-2 rounded-[14px] hover:bg-[#191919] transition"
            >
              <BinIcon />
              <span className="text-[#C1C1C1] text-sm">Clear</span>
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="bg-[#191919] border border-[#232323] rounded-[20px] p-4 sm:p-6 h-[60vh] overflow-y-auto space-y-3">
          {messages.length === 0 && !loading && (
            <p className="text-center text-[#8F8F8F] text-sm mt-10">
              No messages yet. Start a new conversation below!
            </p>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              <div className="p-3 bg-[#232323] rounded-[14px] text-[#F5F5F5] text-sm">
                <strong>User:</strong> {msg.user_message}
              </div>
              <div className="p-3 bg-[#2B2B2B] rounded-[14px] text-[#F5F5F5] text-sm">
                <strong>{extractModelName(msg.model)}:</strong>{" "}
                {msg.ai_response}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
          {loading && (
            <div className="flex justify-center mt-4">
              <Spinner />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 h-12 px-4 bg-[#191919] border border-[#232323] rounded-[14px] text-[#C1C1C1] text-sm outline-none focus:border-[#494949]"
          />
          <button
            onClick={handleSendMessage}
            disabled={loading}
            className="h-12 px-6 bg-[#232323] rounded-[14px] text-[#F5F5F5] text-sm font-semibold hover:bg-[#2B2B2B] transition disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Spinner /> : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
