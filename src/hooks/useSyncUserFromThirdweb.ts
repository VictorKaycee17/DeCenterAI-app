"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { client } from "@/lib/thirdweb";
import { getUserByEmail } from "@/actions/supabase/users";
import { getUserEmail } from "thirdweb/wallets";
import { useActiveAccount } from "thirdweb/react";

export function useSyncUserFromThirdweb() {
  const { setUser, clearUser } = useUser();
  const [isSyncing, setIsSyncing] = useState(true);

  const account = useActiveAccount();

  const syncUser = async () => {
    setIsSyncing(true);
    try {
      // Get user email and wallet address from Thirdweb
      const email = await getUserEmail({ client });
      const wallet = account?.address;

      if (!email || !wallet) {
        clearUser();
        setIsSyncing(false);
        return;
      }

      // Fetch user info from Supabase
      const userRes = await getUserByEmail(email);
      if (!userRes.success) throw new Error("Error getting user from Supabase");

      // If found, set in Zustand
      if (userRes.data.wallet) {
        setUser(email, userRes.data.wallet);
      } else {
        // fallback: use wallet from connected account
        setUser(email, wallet);
      }
    } catch (error) {
      console.error("Error syncing user:", error);
      clearUser();
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncUser();
  }, [account?.address]);

  return { isSyncing };
}
