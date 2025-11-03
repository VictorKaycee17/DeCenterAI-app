"use client";

import { getApiKeysByUser } from "@/actions/supabase/api_keys";
import { getNetworkHealth } from "@/actions/unreal/health";
import HeroSection from "@/components/dashboard/HeroSection";
import StatCard from "@/components/dashboard/StatCard";
import { useUser } from "@/hooks/useUser";
import { client } from "@/lib/thirdweb";
import { fetchTokenBalance } from "@/services/thirdweb.service";
import { getChainConfigById, activeChain } from "@/utils/chains";
import { CloudArrowDown, Key, Pulse } from "@phosphor-icons/react";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function DashboardPage() {
  const { userId, email, wallet } = useUser();
  const [unrealBalance, setUnrealBalance] = useState<string | number>(0);
  const [apiKeysCount, setApiKeysCount] = useState<number>(0);
  const [networkStatus, setNetworkStatus] = useState<string>("loading...");

  const chainConfig = getChainConfigById(activeChain.id);
  const unrealTokenAddress = chainConfig?.custom?.tokens?.UnrealToken?.address;

  // Fetch Unreal token balance
  const getUnrealTokenBalance = async () => {
    if (!wallet) return;
    try {
      const balance = await fetchTokenBalance(
        wallet,
        activeChain,
        client,
        unrealTokenAddress
      );
      setUnrealBalance(balance.displayValue);
    } catch (err) {
      console.error("Error fetching Unreal balance:", err);
      toast.error("Failed to fetch Unreal token balance");
    }
  };

  // Fetch API key count
  const getUserApiKeys = async () => {
    if (!userId) return;
    try {
      const res = await getApiKeysByUser(userId);
      if (res.success && res.data) setApiKeysCount(res.data.length);
    } catch (err) {
      console.error("Error fetching API keys:", err);
      toast.error("Failed to fetch API keys");
    }
  };

  // Fetch Network Health
  const fetchNetworkHealth = async () => {
    const res = await getNetworkHealth();
    if (res.success && res.data) {
      setNetworkStatus(res.data.status);
    } else {
      setNetworkStatus("error");
    }
  };

  useEffect(() => {
    getUnrealTokenBalance();
  }, [wallet]);

  useEffect(() => {
    getUserApiKeys();
  }, [userId]);

  useEffect(() => {
    fetchNetworkHealth();
  }, []);

  return (
    <div className="flex-1 bg-[#050505] min-h-screen text-[#F5F5F5]">
      <div className="p-4 sm:p-8 flex flex-col gap-8 max-w-6xl mx-auto">
        <HeroSection />

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <StatCard
            title="Credits Balance"
            value={`${unrealBalance || 0} Credits`}
            icon={<CloudArrowDown size={42} className="text-[#5D5D5D]" />}
            details={[
              {
                label: "",
                value: "",
              },
            ]}
          />

          <StatCard
            title="Your API Keys"
            value={apiKeysCount.toString()}
            icon={<Key size={42} className="text-[#5D5D5D]" />}
            details={[{ label: "", value: "" }]}
          />

          <StatCard
            title="Network Health"
            value={networkStatus?.toUpperCase()}
            icon={<Pulse size={42} className="text-[#5D5D5D]" />}
            status={networkStatus}
            details={[
              {
                label: "Status",
                value: networkStatus === "ok" ? "Healthy" : "Check connection",
              },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
