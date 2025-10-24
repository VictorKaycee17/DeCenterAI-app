"use client";

import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import React from "react";
import { useActiveWallet, useDisconnect } from "thirdweb/react";

export default function DashboardPage() {
  const { email, wallet, clearUser } = useUser();
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const userWallet = useActiveWallet();

  const handleSignOut = async () => {
    try {
      // 1. Disconnect wallet
      if (userWallet) {
        await disconnect(userWallet);
      }

      // 2. Clear Zustand store
      clearUser();

      // 3. Remove auth cookie (if you used /api/auth/session)
      await fetch("/api/auth/session", {
        method: "DELETE",
      });

      // 4. Redirect to Sign In page
      router.push("/signin");
    } catch (err) {
      console.error("Error during sign out:", err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <header className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-8">
        <h1 className="text-2xl font-semibold">Decenter AI Dashboard</h1>
        <button
          onClick={handleSignOut}
          className="rounded-md bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700 transition"
        >
          Sign Out
        </button>
      </header>

      <div>
        <p className="text-neutral-400">Email: {email || "—"}</p>
        <p className="text-neutral-400">Wallet: {wallet || "—"}</p>
      </div>
    </div>
  );
}
