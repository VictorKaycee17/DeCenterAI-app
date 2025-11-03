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
      if (!userRes.success)
        throw new Error(userRes.message || "Error getting user from Supabase");

      const user = userRes.data;

      // Set user in Zustand
      setUser(
        user.id,
        email,
        user.wallet || wallet,
        user.username || null,
        user.profile_image || null
      );
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
