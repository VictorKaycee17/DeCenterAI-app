"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { models } from "@/utils/models";
import TokenInvalidMessage from "@/components/messages/TokenInvalidMessage";
import Spinner from "@/components/ui/icons/Spinner";
import { BinIcon } from "@/components/ui/icons";

import { getUserByWallet } from "@/actions/supabase/users";
import { verifyUnrealSessionToken } from "@/actions/unreal/auth";
import {
  deleteAllChatHistory,
  fetchChatHistory,
  saveChatMessage,
} from "@/actions/supabase/chat_history";
import { getApiKeysByUser } from "@/actions/supabase/api_keys";

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

  // ----------------------------
  // Fetch User + Chat History
  // ----------------------------
  const fetchUser = async () => {
    if (!userAccount?.address) return;

    try {
      const userRes = await getUserByWallet(userAccount.address);
      if (!userRes.success || !userRes.data) throw new Error("Failed to fetch user data");

      const { id, unreal_token } = userRes.data;
      setUserId(id);
      setUnrealToken(unreal_token);

      if (unreal_token) {
        const verifyRes = await verifyUnrealSessionToken(unreal_token);
        setIsUnrealTokenValid(verifyRes.success);
      } else {
        setIsUnrealTokenValid(false);
      }

      const history = await fetchChatHistory(id, 5);
      setMessages(history);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load user or chat history");
    }
  };

  // ----------------------------
  // Fetch API Keys for User
  // ----------------------------
  const fetchApiKeys = async (uid: number) => {
    try {
      const res = await getApiKeysByUser(uid);
      if (!res.success) throw new Error("Failed to fetch API keys");

      const keys = res.data || [];
      setApiKeys(keys);
      setSelectedApiKey(keys[0]?.api_key || unrealToken || "");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch API keys");
    }
  };

  // ----------------------------
  // Send Message → Agent → Unreal → Hedera
  // ----------------------------
  const handleSendMessage = async () => {
    if (!input.trim()) return toast.error("Enter a message");
    if (!selectedApiKey) return toast.error("Missing API key");
    if (!userId) return toast.error("User not found");

    setLoading(true);
    try {
      const resp = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          apiKey: selectedApiKey,
          model: selectedModel,
          prompt: input,
        }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        console.error("Agent error", data);
        throw new Error(data.message || "Agent failed");
      }

      const aiResponse = data.aiResponse ?? "No response";

      await saveChatMessage(
        userId,
        input,
        aiResponse,
        selectedModel,
        data.object || "chat.completion"
      );

      setInput("");
      const history = await fetchChatHistory(userId, 5);
      setMessages(history);
    } catch (err) {
      console.error(err);
      toast.error("Failed to get AI response");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------
  // Clear Chat History
  // ----------------------------
  const handleClear = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await deleteAllChatHistory(userId);
      setMessages([]);
      toast.info("Chat history cleared");
    } catch {
      toast.error("Failed to clear chat history");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------
  // Effects
  // ----------------------------
  useEffect(() => {
    if (userAccount?.address) fetchUser();
  }, [userAccount]);

  useEffect(() => {
    if (userId) fetchApiKeys(userId);
  }, [userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ----------------------------
  // UI
  // ----------------------------
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
            {/* Model Selector */}
            <div className="flex items-center gap-2">
              <label className="text-[#C1C1C1] text-sm">Model:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="h-10 px-3 bg-[#191919] border border-[#232323] rounded-[14px] text-[#8F8F8F] text-sm"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Selector */}
            <div className="flex items-center gap-2">
              <label className="text-[#C1C1C1] text-sm">API Key:</label>
              <select
                value={selectedApiKey}
                onChange={(e) => setSelectedApiKey(e.target.value)}
                className="h-10 px-3 bg-[#191919] border border-[#232323] rounded-[14px] text-[#8F8F8F] text-sm max-w-[180px]"
              >
                {apiKeys.length > 0 ? (
                  apiKeys.map((k) => (
                    <option key={k.id} value={k.api_key}>
                      {k.api_name}
                    </option>
                  ))
                ) : (
                  <option value={unrealToken || ""}>Session Token</option>
                )}
              </select>
            </div>

            {/* Clear Button */}
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
