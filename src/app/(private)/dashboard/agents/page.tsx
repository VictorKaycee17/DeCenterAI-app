"use client";

import {
  createUnrealApiKey,
  deleteApiKey,
  getAllUnrealApiKeys,
} from "@/actions/unreal/api";
import { getUserByWallet } from "@/actions/supabase/users";
import {
  getApiKeysByUser,
  syncApiKeysWithUnreal,
} from "@/actions/supabase/api_keys";
import { verifyUnrealSessionToken } from "@/actions/unreal/auth";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ApiKeyType } from "@/utils/types";
import TokenInvalidMessage from "@/components/messages/TokenInvalidMessage";
import Spinner from "@/components/ui/icons/Spinner";
import RefreshCW from "@/components/ui/icons/RefreshCW";

export default function AgentsPage() {
  const userAccount = useActiveAccount();
  const userWallet = useActiveWallet();

  const [apiKeys, setApiKeys] = useState<ApiKeyType[]>([]);
  const [filter, setFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiName, setApiName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isUnrealTokenValid, setIsUnrealTokenValid] = useState(true);

  // 🔄 Fetch and sync API keys
  const fetchAndSyncApiKeys = async () => {
    if (!userAccount?.address) return;
    setLoading(true);

    try {
      const userRes = await getUserByWallet(userAccount.address);
      if (!userRes.success || !userRes.data.id)
        throw new Error("Failed to retrieve user ID");

      const { id: userId, unreal_token } = userRes.data;

      // Validate Unreal token
      if (unreal_token) {
        const verifyRes = await verifyUnrealSessionToken(unreal_token);
        setIsUnrealTokenValid(verifyRes.success);
      } else setIsUnrealTokenValid(false);

      // Fetch Unreal keys
      const unrealKeysRes = await getAllUnrealApiKeys(userAccount.address);
      if (!unrealKeysRes.success) {
        toast.error(unrealKeysRes.message || "Failed to fetch API keys");
      }

      // Sync Supabase if needed
      if (unrealKeysRes.data?.length) {
        await syncApiKeysWithUnreal(userId, unrealKeysRes.data);
      }

      // Fetch synced keys
      const apiKeysRes = await getApiKeysByUser(userId);
      if (!apiKeysRes.success)
        throw new Error("Failed to fetch API keys from Supabase");

      setApiKeys(apiKeysRes.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred while syncing API keys"
      );
    } finally {
      setLoading(false);
    }
  };

  // ➕ Generate a new API Key
  const handleGenerateApi = async () => {
    if (!userAccount?.address) return toast.error("Please connect your wallet");
    if (!apiName.trim()) return toast.error("API name cannot be blank");

    try {
      const res = await createUnrealApiKey(userAccount.address, apiName);
      if (!res.success) throw new Error(res.message);

      toast.success("API key generated successfully");
      setIsModalOpen(false);
      setApiName("");
      await fetchAndSyncApiKeys();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate API key"
      );
    }
  };

  // 📋 Copy API key
  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied!");
  };

  // 🗑 Revoke API key
  const handleRevokeApiKey = async (key: string) => {
    if (!userAccount?.address) return toast.error("Please connect your wallet");
    try {
      const res = await deleteApiKey(key, userAccount.address);
      if (!res.success) throw new Error(res.message);

      toast.success("API key revoked");
      await fetchAndSyncApiKeys();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke API key"
      );
    }
  };

  const filteredApiKeys = apiKeys.filter((k) =>
    k.api_name?.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    fetchAndSyncApiKeys();
  }, [userAccount]);

  return (
    <div className="flex-1 bg-[#191919]/15 p-4 sm:p-8">
      {!isUnrealTokenValid && (
        <TokenInvalidMessage
          account={userAccount}
          chainId={userWallet?.getChain()?.id}
          onRefreshSuccess={fetchAndSyncApiKeys}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-0">
        {/* Header */}
        <div className="bg-[#050505] border border-[#232323] rounded-t-2xl border-b-0 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-normal text-[#F5F5F5]">APIs</h1>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {/* Filter input */}
              <div className="flex items-center gap-2 bg-[#191919] rounded-[28px] px-4 py-2 flex-1 sm:w-64">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                    stroke="#5D5D5D"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  placeholder="Filter by name"
                  className="flex-1 bg-transparent text-[#C1C1C1] text-sm outline-none"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#232323] text-[#F5F5F5] px-5 py-2 rounded-[20px] font-semibold text-sm sm:text-base hover:bg-[#2B2B2B] transition"
              >
                Generate API
              </button>

              <button
                onClick={fetchAndSyncApiKeys}
                className="flex items-center justify-center bg-[#232323] p-2 rounded-[20px] hover:bg-[#2B2B2B] transition"
              >
                <RefreshCW />
              </button>
            </div>
          </div>
        </div>

        {/* Subheader */}
        <div className="bg-[#050505] border border-[#232323] border-t-0 border-b-0 px-6 py-2 text-[#C1C1C1] text-sm">
          Total APIs {apiKeys.length}
        </div>

        {/* List */}
        {loading ? (
          <Spinner />
        ) : (
          <div className="bg-[#080808] border border-[#191919] rounded-b-2xl p-4 sm:p-6 overflow-x-auto">
            <div className="flex flex-col gap-4 min-w-[500px]">
              {filteredApiKeys.map((key) => (
                <div
                  key={key.id}
                  className="bg-transparent border border-[#232323] rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  {/* Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 flex-1 min-w-0">
                    <span className="text-[#C1C1C1] text-sm font-medium truncate">
                      {key.api_name}
                    </span>
                    <span className="text-[#8F8F8F] text-xs font-medium">
                      Created:{" "}
                      {key.created_at
                        ? new Date(key.created_at).toLocaleDateString()
                        : ""}
                    </span>
                    <span className="text-[#8F8F8F] text-xs font-medium">
                      Calls: {key.calls?.toFixed(2) ?? 0}
                    </span>
                    <span className="text-[#8F8F8F] text-xs font-medium">
                      Last Used:{" "}
                      {key.last_used
                        ? new Date(key.last_used).toLocaleDateString()
                        : ""}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => handleCopyApiKey(key.api_key)}
                      className="bg-[#232323] px-4 py-2 rounded-[20px] text-sm text-[#F5F5F5] hover:bg-[#2B2B2B] transition"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleRevokeApiKey(key.api_key)}
                      className="bg-[#232323] px-4 py-2 rounded-[20px] text-sm text-[#F5F5F5] hover:bg-[#2B2B2B] transition"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#080808] border border-[#232323] rounded-[20px] p-6 w-11/12 max-w-md">
            <h2 className="text-xl font-normal text-[#F5F5F5] mb-4">
              Generate API Key
            </h2>
            <input
              value={apiName}
              onChange={(e) => setApiName(e.target.value)}
              placeholder="Enter API name"
              className="w-full bg-[#191919] text-[#C1C1C1] px-4 py-2 rounded-[20px] mb-4 outline-none"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setApiName("");
                }}
                className="bg-[#232323] text-[#F5F5F5] px-5 py-2 rounded-[20px] hover:bg-[#2B2B2B]"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateApi}
                className="bg-[#232323] text-[#F5F5F5] px-5 py-2 rounded-[20px] font-semibold hover:bg-[#2B2B2B]"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
