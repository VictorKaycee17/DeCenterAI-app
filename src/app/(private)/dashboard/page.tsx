"use client";

import { getUserApiKeysSummary } from "@/actions/supabase/api_keys";
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
  const { userId, wallet } = useUser();
  const [unrealBalance, setUnrealBalance] = useState<string | number>(0);
  const [apiKeysCount, setApiKeysCount] = useState<number>(0);
  const [totalInferences, setTotalInferences] = useState<number>(0);
  const [networkStatus, setNetworkStatus] = useState<string>("loading...");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const chainConfig = getChainConfigById(activeChain.id);
  const unrealTokenAddress = chainConfig?.custom?.tokens && 'UnrealToken' in chainConfig.custom.tokens
    ? chainConfig.custom.tokens.UnrealToken?.address
    : undefined;

  // Fetch Unreal token balance (from Somnia testnet)
  const getUnrealTokenBalance = async () => {
    if (!wallet) return;
    try {
      setIsRefreshing(true);
      const balance = await fetchTokenBalance(
        wallet,
        activeChain,
        client,
        unrealTokenAddress
      );
      setUnrealBalance(balance.displayValue);
    } catch (err) {
      console.error("Error fetching Unreal balance:", err);
      // Don't show error toast on automatic refresh to avoid spamming user
    } finally {
      setIsRefreshing(false);
    }
  };
  // Fetch API key summary (count + inferences)
  const getUserApiKeysSummaryData = async () => {
    if (!userId) return;
    try {
      const res = await getUserApiKeysSummary(userId);
      if (res.success && res.data) {
        setApiKeysCount(res.data.totalKeys);
        setTotalInferences(res.data.totalInferences);
      } else {
        toast.warning(res.message || "Failed to fetch API keys summary");
      }
    } catch (err) {
      console.error("Error fetching API key summary:", err);
      toast.error("Failed to fetch API key summary");
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

  // Initial load and real-time polling for balance updates
  useEffect(() => {
    if (!wallet) return;

    // Initial fetch
    getUnrealTokenBalance();

    // Poll every 10 seconds for real-time balance updates
    const balanceInterval = setInterval(() => {
      getUnrealTokenBalance();
    }, 10000); // 10 seconds

    return () => clearInterval(balanceInterval);
  }, [wallet]);

  useEffect(() => {
    getUserApiKeysSummaryData();
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
            value={`${unrealBalance || 0} ${parseFloat(unrealBalance.toString()) === 1 ? 'Credit' : 'Credits'}`}
            icon={<CloudArrowDown size={42} className={`${isRefreshing ? 'animate-pulse' : ''} text-[#5D5D5D]`} />}
            details={[]}
          />

          <StatCard
            title="Your API Keys"
            value={apiKeysCount.toString()}
            icon={<Key size={42} className="text-[#5D5D5D]" />}
            details={[
              {
                label: "Total Inferences",
                value: totalInferences.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                }),
              },
            ]}
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
